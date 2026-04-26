import { EventEmitter } from 'events'
import { existsSync, mkdirSync } from 'fs'
import { promises as fsPromises } from 'fs'
import { join } from 'path'
import { Boom } from '@hapi/boom'
import chalk from 'chalk'
import moment from 'moment'
import qrcode from 'qrcode'
import axios from 'axios'
import pino from 'pino'
import NodeCache from 'node-cache'
import {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    Browsers,
    DisconnectReason,
    downloadMediaMessage as baileysDownloadMediaMessage,
    extractMessageContent,
    getContentType,
    normalizeMessageContent,
    isJidGroup,
    isJidBroadcast,
    isJidNewsletter,
    jidNormalizedUser,
    areJidsSameUser,
    proto,
    type WASocket,
    type WAMessage,
    type WAMessageContent,
    type WAMessageKey,
    type AnyMessageContent,
    type GroupMetadata,
    type ConnectionState,
    type WAVersion
} from 'baileys'

import DatabaseHandler from '../Handlers/DatabaseHandler.js'
import Utils from './Utils.js'
import {
    IConfig,
    IContactInfo,
    IExtendedGroupMetadata,
    IFeatureModel,
    IGroupModel,
    ISimplifiedMessage,
    IUserModel
} from '../typings/index.js'
import { MessageType, Mimetype } from './types.js'

type ConnectionStatus = 'open' | 'connecting' | 'close'

// Translate the legacy MessageType / Mimetype calling style into a v7
// AnyMessageContent payload.
const buildMessageContent = (
    content: string | Buffer,
    type: string = MessageType.text,
    mime?: string,
    mention?: string[],
    caption?: string,
    thumbnail?: Buffer
): AnyMessageContent => {
    const mentions = mention && mention.length ? mention : undefined
    if (typeof content === 'string') {
        return { text: content, mentions } as AnyMessageContent
    }
    switch (type) {
        case MessageType.image:
            return {
                image: content,
                caption,
                mimetype: mime,
                mentions,
                jpegThumbnail: thumbnail
            } as AnyMessageContent
        case MessageType.video:
            return {
                video: content,
                caption,
                mimetype: mime,
                mentions,
                gifPlayback: mime === Mimetype.gif,
                jpegThumbnail: thumbnail
            } as AnyMessageContent
        case MessageType.sticker:
            return { sticker: content, mimetype: Mimetype.webp } as AnyMessageContent
        case MessageType.audio:
            return {
                audio: content,
                mimetype: mime || 'audio/ogg; codecs=opus',
                ptt: false
            } as AnyMessageContent
        case MessageType.document:
            return {
                document: content,
                mimetype: mime || 'application/octet-stream',
                fileName: caption || 'file'
            } as AnyMessageContent
        case MessageType.text:
        case MessageType.extendedText:
            return { text: content.toString('utf8'), mentions } as AnyMessageContent
        default:
            return { text: content.toString('utf8'), mentions } as AnyMessageContent
    }
}

export default class WAClient extends EventEmitter {
    sock!: WASocket
    DB = new DatabaseHandler()
    util = new Utils()
    assets = new Map<string, Buffer>()
    features = new Map<string, boolean>()
    contacts = new Map<string, IContactInfo>()
    chats = new Set<string>()

    /** LRU cache of recent messages keyed by message id, used by getMessage for poll decryption + retries. */
    private messageCache = new NodeCache({ stdTTL: 60 * 60, useClones: false, maxKeys: 1000 })

    /** Group metadata cache to avoid hammering WA's metadata endpoint. */
    private groupMetadataCache = new NodeCache({ stdTTL: 5 * 60, useClones: false })

    /** Retry counter cache used by Baileys for failed-decrypt retries. */
    private msgRetryCounterCache = new NodeCache({ stdTTL: 60, useClones: false })

    /** User device cache. */
    private userDevicesCache = new NodeCache({ stdTTL: 5 * 60, useClones: false })

    /** Message IDs the bot itself sent. We skip these when they echo back via
     * `messages.upsert` (otherwise commands run by the bot's own number would
     * trigger their own replies in an infinite loop). 2-minute TTL covers any
     * realistic echo-arrival delay. */
    private sentByBot = new NodeCache({ stdTTL: 120, useClones: false })

    /** Per-JID burst counter — last-resort circuit breaker if the primary
     * defenses fail (e.g., bot crash between send and echo, or a bot reply
     * accidentally starts with the command prefix). If the same chat triggers
     * more than this many commands within the rolling window, drop further
     * fromMe messages until the window expires. */
    private static readonly LOOP_BURST_LIMIT = 8
    private static readonly LOOP_BURST_WINDOW_MS = 10_000
    private commandBurst = new Map<string, number[]>()

    state: ConnectionStatus = 'connecting'
    QR?: Buffer
    private logger = pino({ level: process.env.LOG_LEVEL || 'fatal' })
    /** Guards against multiple concurrent reconnect attempts when WA fires
     * `connection.update {connection: 'close'}` twice in quick succession. */
    private isReconnecting = false
    private user_: { id: string; jid: string; name?: string; lid?: string } | null = null
    /** Set of every JID (in PN AND LID forms) that's considered a moderator,
     * resolved at connect time so that LID-only groups still match the
     * PN-form mods listed in the config env var. */
    private modJids = new Set<string>()

    constructor(public config: IConfig) {
        super()
    }

    log = (text: string, error?: boolean): void => {
        console.log(
            chalk[error ? 'red' : 'green']('[KAOI]'),
            chalk.blue(moment().format('DD/MM HH:mm:ss')),
            chalk.yellowBright(text)
        )
    }

    get user(): {
        jid: string
        id: string
        lid?: string
        name?: string
        notify?: string
        vname?: string
        short?: string
    } {
        const id = this.user_?.jid || this.user_?.id || ''
        return {
            id,
            jid: id,
            lid: this.user_?.lid,
            name: this.user_?.name,
            notify: this.user_?.name,
            vname: this.user_?.name,
            short: this.user_?.name?.split(' ')[0]
        }
    }

    /** Match a JID against the bot's own user, regardless of LID/PN form. */
    isMe = (jid: string | null | undefined): boolean => {
        if (!jid) return false
        const n = jidNormalizedUser(jid)
        if (this.user_?.jid && areJidsSameUser(n, this.user_.jid)) return true
        if (this.user_?.lid && areJidsSameUser(n, this.user_.lid)) return true
        return false
    }

    /** True if a JID is configured as a mod (matches in either LID or PN form). */
    isMod = (jid: string | null | undefined): boolean => {
        if (!jid) return false
        const n = jidNormalizedUser(jid)
        if (this.modJids.has(n)) return true
        // Also match by user portion in case device suffix differs.
        for (const m of this.modJids) if (areJidsSameUser(m, n)) return true
        return this.isMe(jid)
    }

    /** Convenience: is the bot an admin of this group? */
    isBotAdmin = (meta?: IExtendedGroupMetadata | null): boolean =>
        !!meta?.admins?.some((j) => this.isMe(j))

    /** Resolve every configured mod's LID counterpart so isMod() matches in
     * LID-addressed groups too. Best-effort — failures are silent. */
    private resolveMods = async (): Promise<void> => {
        this.modJids.clear()
        for (const m of this.config.mods || []) {
            if (!m) continue
            const norm = jidNormalizedUser(m)
            this.modJids.add(norm)
            try {
                const lid = await this.sock.signalRepository?.lidMapping?.getLIDForPN?.(norm)
                if (lid) this.modJids.add(jidNormalizedUser(lid))
            } catch {
                /* ignore */
            }
        }
    }

    connect = async (): Promise<void> => {
        const sessionDir = join(process.cwd(), 'sessions', this.config.session)
        if (!existsSync(sessionDir)) mkdirSync(sessionDir, { recursive: true })
        const { state: authState, saveCreds } = await useMultiFileAuthState(sessionDir)
        const { version, isLatest } = await fetchLatestBaileysVersion()
        this.log(`Using Baileys WA v${version.join('.')} (latest: ${isLatest})`)

        this.sock = makeWASocket({
            version: version as WAVersion,
            auth: authState,
            logger: this.logger,
            browser: Browsers.appropriate('Kaoi'),
            getMessage: this.getMessage,
            cachedGroupMetadata: this.cachedGroupMetadata,
            // node-cache satisfies the CacheStore shape Baileys actually uses; the
            // typed `PossiblyExtendedCacheStore` declares async mget/mset which
            // node-cache implements synchronously. Cast through unknown to bridge.
            msgRetryCounterCache: this.msgRetryCounterCache as unknown as never,
            userDevicesCache: this.userDevicesCache as unknown as never,
            shouldIgnoreJid: this.shouldIgnoreJid,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            markOnlineOnConnect: true,
            defaultQueryTimeoutMs: 60_000,
            retryRequestDelayMs: 250,
            maxMsgRetryCount: 5
        })

        this.sock.ev.on('creds.update', saveCreds)

        this.sock.ev.on('connection.update', (update) => this.handleConnectionUpdate(update))

        this.sock.ev.on('messages.upsert', ({ messages, type }) => {
            if (type !== 'notify' && type !== 'append') return
            for (const m of messages) {
                if (!m.message || !m.key) continue

                // --- Loop-prevention layer 1: skip echoes of bot-sent messages.
                if (m.key.id && this.sentByBot.has(m.key.id)) {
                    this.sentByBot.del(m.key.id)
                    continue
                }

                // --- Loop-prevention layer 2: ignore fromMe messages older than
                // 60 seconds. Catches stale echoes that arrive after a restart
                // (when sentByBot has been wiped). Real user-typed commands have
                // a fresh timestamp so they're unaffected.
                if (m.key.fromMe) {
                    const tsSec = Number(m.messageTimestamp || 0)
                    if (tsSec > 0 && Date.now() / 1000 - tsSec > 60) continue
                }

                // --- Loop-prevention layer 3: per-chat burst circuit breaker.
                // If a runaway loop somehow gets past the first two defenses,
                // we cap fromMe-driven activity per chat in a short window.
                if (m.key.fromMe && m.key.remoteJid) {
                    const now = Date.now()
                    const arr = (this.commandBurst.get(m.key.remoteJid) || []).filter(
                        (t) => now - t < WAClient.LOOP_BURST_WINDOW_MS
                    )
                    if (arr.length >= WAClient.LOOP_BURST_LIMIT) {
                        this.log(
                            chalk.red(
                                `Loop guard tripped for ${m.key.remoteJid} — dropping fromMe message`
                            ),
                            true
                        )
                        this.commandBurst.set(m.key.remoteJid, arr)
                        continue
                    }
                    arr.push(now)
                    this.commandBurst.set(m.key.remoteJid, arr)
                }

                if (m.key.id) {
                    const normalized = normalizeMessageContent(m.message)
                    if (normalized) this.messageCache.set(m.key.id, normalized)
                }
                if (m.key.remoteJid) this.chats.add(m.key.remoteJid)
                // Proactively snapshot view-once media on arrival — WhatsApp's
                // CDN garbage-collects view-once media quickly, so a deferred
                // !retrieve on an old message will fail without this cache.
                this.captureViewOnce(m as WAMessage).catch(() => undefined)
                this.emitNewMessage(this.simplifyMessage(m as WAMessage))
            }
        })

        this.sock.ev.on('contacts.upsert', (contacts) => {
            for (const c of contacts) {
                if (!c.id) continue
                this.contacts.set(c.id, {
                    notify: c.notify || c.name,
                    name: c.name,
                    vname: c.verifiedName
                })
            }
        })

        this.sock.ev.on('contacts.update', (contacts) => {
            for (const c of contacts) {
                if (!c.id) continue
                const existing = this.contacts.get(c.id) || {}
                this.contacts.set(c.id, {
                    ...existing,
                    notify: c.notify || c.name || existing.notify,
                    name: c.name || existing.name,
                    vname: c.verifiedName || existing.vname
                })
            }
        })

        this.sock.ev.on('chats.upsert', (chats) => {
            for (const c of chats) if (c.id) this.chats.add(c.id)
        })

        this.sock.ev.on('groups.update', (updates) => {
            for (const u of updates) {
                if (u.id) this.groupMetadataCache.del(u.id)
            }
        })

        this.sock.ev.on('group-participants.update', (event) => {
            this.groupMetadataCache.del(event.id)
            this.emit('group-participants-update', {
                jid: event.id,
                participants: event.participants,
                action: event.action,
                actor: event.author
            })
        })

        this.sock.ev.on('call', (calls) => {
            for (const c of calls) {
                if (c.status === 'offer') this.emit('incoming-call', { id: c.id, from: c.from })
            }
        })
    }

    private handleConnectionUpdate = async (update: Partial<ConnectionState>): Promise<void> => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
            this.QR = await qrcode.toBuffer(qr)
            this.log(
                chalk.redBright(
                    `Scan the QR code | Authenticate at http://localhost:${process.env.PORT || 4040}/wa/qr?session=${
                        this.config.session
                    }`
                )
            )
            try {
                this.log(await qrcode.toString(qr, { type: 'terminal', small: true }))
            } catch {
                /* ignore */
            }
        }
        if (connection) this.state = connection
        if (connection === 'open') {
            const id = this.sock.user?.id ? jidNormalizedUser(this.sock.user.id) : ''
            const lidRaw = (this.sock.user as { lid?: string })?.lid
            this.user_ = {
                id,
                jid: id,
                name: this.sock.user?.name,
                lid: lidRaw ? jidNormalizedUser(lidRaw) : undefined
            }
            this.QR = undefined
            // Pre-resolve mod LIDs so isMod() works on first group message.
            this.resolveMods().catch(() => undefined)
            // Kick off background view-once cache pruner.
            this.pruneViewOnce().catch(() => undefined)
            if (!this.viewOncePruneTimer) {
                this.viewOncePruneTimer = setInterval(
                    () => this.pruneViewOnce().catch(() => undefined),
                    6 * 60 * 60 * 1000
                )
            }
            this.emit('open')
        } else if (connection === 'close') {
            const code = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode
            const shouldReconnect = code !== DisconnectReason.loggedOut
            this.log(
                chalk.yellow(
                    `Connection closed${code ? ` (code ${code})` : ''}. ${
                        shouldReconnect ? 'Reconnecting...' : 'Logged out — delete sessions/ to re-pair.'
                    }`
                ),
                !shouldReconnect
            )
            if (shouldReconnect && !this.isReconnecting) {
                this.isReconnecting = true
                setTimeout(() => {
                    this.connect()
                        .catch((e) => this.log(String(e), true))
                        .finally(() => {
                            this.isReconnecting = false
                        })
                }, 1500)
            }
        }
    }

    /** Cache directory for proactively-snapshotted view-once media. */
    private viewOnceDir = join(process.cwd(), 'cache', 'viewonce')
    private viewOncePruneTimer: NodeJS.Timeout | null = null

    /** Detect any view-once wrapper in `M.message` and download+save the inner
     * media to disk indexed by message id. WhatsApp's CDN expires view-once
     * media quickly, so this must run on receipt — deferred downloads fail. */
    private captureViewOnce = async (M: WAMessage): Promise<void> => {
        if (!M.key.id || !M.message) return
        const msg = M.message as Record<string, unknown> & {
            viewOnceMessage?: { message?: WAMessageContent } | null
            viewOnceMessageV2?: { message?: WAMessageContent } | null
            viewOnceMessageV2Extension?: { message?: WAMessageContent } | null
        }
        const wrapper =
            msg.viewOnceMessage || msg.viewOnceMessageV2 || msg.viewOnceMessageV2Extension
        const inner = wrapper?.message || extractMessageContent(M.message)
        if (!inner) return
        const innerCast = inner as { imageMessage?: unknown; videoMessage?: unknown }
        if (!innerCast.imageMessage && !innerCast.videoMessage) return

        try {
            if (!existsSync(this.viewOnceDir)) mkdirSync(this.viewOnceDir, { recursive: true })
            const downloadable = { key: M.key, message: inner } as WAMessage
            const buffer = (await baileysDownloadMediaMessage(downloadable, 'buffer', {})) as Buffer
            const kind = innerCast.imageMessage ? 'image' : 'video'
            const path = join(this.viewOnceDir, `${M.key.id}.bin`)
            const metaPath = join(this.viewOnceDir, `${M.key.id}.json`)
            await fsPromises.writeFile(path, buffer)
            await fsPromises.writeFile(
                metaPath,
                JSON.stringify({
                    type: kind,
                    capturedAt: Date.now(),
                    from: M.key.remoteJid,
                    sender: M.key.participant || M.key.remoteJid
                })
            )
        } catch (err) {
            this.log(chalk.yellow(`Failed to capture view-once ${M.key.id}: ${String(err)}`))
        }
    }

    /** TTL for view-once snapshots before background eviction (7 days). */
    private static readonly VIEW_ONCE_TTL_MS = 7 * 24 * 60 * 60 * 1000

    /** Background pruner: deletes view-once snapshots older than the TTL.
     * Runs once on connect and then every 6 hours. Idempotent and safe to skip
     * on errors (e.g. cache dir doesn't exist yet). */
    private pruneViewOnce = async (): Promise<void> => {
        try {
            if (!existsSync(this.viewOnceDir)) return
            const entries = await fsPromises.readdir(this.viewOnceDir)
            const cutoff = Date.now() - WAClient.VIEW_ONCE_TTL_MS
            for (const entry of entries) {
                const full = join(this.viewOnceDir, entry)
                try {
                    const stat = await fsPromises.stat(full)
                    if (stat.mtimeMs < cutoff) await fsPromises.unlink(full)
                } catch {
                    /* ignore single-file errors */
                }
            }
        } catch {
            /* ignore directory-level errors */
        }
    }

    /** Look up a captured view-once media by the original message id. Returns
     * undefined if we never saw it or the snapshot was deleted. */
    getCapturedViewOnce = async (
        id: string | null | undefined
    ): Promise<{ buffer: Buffer; type: 'image' | 'video' } | undefined> => {
        if (!id) return undefined
        const path = join(this.viewOnceDir, `${id}.bin`)
        const metaPath = join(this.viewOnceDir, `${id}.json`)
        try {
            const [buffer, metaRaw] = await Promise.all([
                fsPromises.readFile(path),
                fsPromises.readFile(metaPath, 'utf8')
            ])
            const meta = JSON.parse(metaRaw) as { type: 'image' | 'video' }
            return { buffer, type: meta.type }
        } catch {
            return undefined
        }
    }

    /** Required by makeWASocket: retrieve a previously-sent message by key for resends + poll decryption. */
    private getMessage = async (key: WAMessageKey): Promise<WAMessageContent | undefined> => {
        if (key.id && this.messageCache.has(key.id)) {
            const cached = this.messageCache.get<WAMessageContent>(key.id)
            return cached || undefined
        }
        return undefined
    }

    /** Group metadata cache hook — prevents redundant getGroupMetadata calls during message send. */
    private cachedGroupMetadata = async (jid: string): Promise<GroupMetadata | undefined> => {
        if (!isJidGroup(jid)) return undefined
        const cached = this.groupMetadataCache.get<GroupMetadata>(jid)
        if (cached) return cached
        try {
            const metadata = await this.sock.groupMetadata(jid)
            if (metadata) this.groupMetadataCache.set(jid, metadata)
            return metadata
        } catch {
            return undefined
        }
    }

    /** Don't process messages from broadcast lists or newsletters. */
    private shouldIgnoreJid = (jid: string): boolean => {
        if (!jid) return false
        if (isJidBroadcast(jid)) return true
        if (isJidNewsletter(jid)) return true
        return false
    }

    /** Track a bot-sent message ID so we can ignore its echo in messages.upsert. */
    private trackSent = (sent: WAMessage | undefined): void => {
        const id = sent?.key?.id
        if (id) this.sentByBot.set(id, true)
    }

    sendMessage = async (
        jid: string,
        content: string | Buffer,
        type?: string,
        options: {
            caption?: string
            mimetype?: string
            contextInfo?: proto.IContextInfo
            quoted?: WAMessage
            thumbnail?: Buffer
        } = {}
    ): Promise<WAMessage | undefined> => {
        const mention = options.contextInfo?.mentionedJid as string[] | undefined
        const payload = buildMessageContent(
            content,
            type,
            options.mimetype,
            mention,
            options.caption,
            options.thumbnail
        )
        const sent = (await this.sock.sendMessage(jid, payload, { quoted: options.quoted })) as
            | WAMessage
            | undefined
        this.trackSent(sent)
        return sent
    }

    downloadMediaMessage = async (message: WAMessage): Promise<Buffer> => {
        const buffer = await baileysDownloadMediaMessage(message, 'buffer', {})
        return buffer as Buffer
    }

    groupMetadata = async (jid: string): Promise<GroupMetadata> => {
        const cached = this.groupMetadataCache.get<GroupMetadata>(jid)
        if (cached) return cached
        const meta = await this.sock.groupMetadata(jid)
        this.groupMetadataCache.set(jid, meta)
        return meta
    }

    fetchGroupMetadataFromWA = async (jid: string): Promise<GroupMetadata> => this.sock.groupMetadata(jid)

    groupRemove = async (jid: string, users: string[]) =>
        this.sock.groupParticipantsUpdate(jid, users, 'remove')

    groupPromote = async (jid: string, users: string[]) =>
        this.sock.groupParticipantsUpdate(jid, users, 'promote')

    groupDemote = async (jid: string, users: string[]) =>
        this.sock.groupParticipantsUpdate(jid, users, 'demote')

    groupAdd = async (jid: string, users: string[]) =>
        this.sock.groupParticipantsUpdate(jid, users, 'add')

    groupInviteCode = async (jid: string): Promise<string | undefined> => this.sock.groupInviteCode(jid)

    groupRevokeInvite = async (jid: string): Promise<string | undefined> => this.sock.groupRevokeInvite(jid)

    groupUpdateSubject = async (jid: string, subject: string): Promise<void> =>
        this.sock.groupUpdateSubject(jid, subject)

    groupUpdateDescription = async (jid: string, description: string): Promise<void> => {
        await this.sock.groupUpdateDescription(jid, description)
    }

    groupAcceptInvite = async (code: string): Promise<string | undefined> => this.sock.groupAcceptInvite(code)

    groupLeave = async (jid: string): Promise<void> => {
        await this.sock.groupLeave(jid)
    }

    /** Legacy aliases kept for command compat. */
    groupMakeAdmin = async (jid: string, users: string[]) => this.groupPromote(jid, users)
    groupDemoteAdmin = async (jid: string, users: string[]) => this.groupDemote(jid, users)

    /** Translate legacy `groupSettingChange(jid, GroupSettingChange.messageSend, true|false)`.
     * value=true → close (announcement), value=false → open (not_announcement). */
    groupSettingChange = async (jid: string, _setting: string, value: boolean): Promise<void> => {
        await this.sock.groupSettingUpdate(jid, value ? 'announcement' : 'not_announcement')
    }

    acceptInvite = async (code: string): Promise<{ status: number; gid?: string }> => {
        try {
            const gid = await this.sock.groupAcceptInvite(code)
            return { status: 200, gid }
        } catch {
            return { status: 401 }
        }
    }

    sendPresenceUpdate = async (status: 'available' | 'composing' | 'recording' | 'paused'): Promise<void> => {
        await this.sock.sendPresenceUpdate(status)
    }

    getProfilePicture = async (jid: string): Promise<Buffer | undefined> => {
        try {
            const url = await this.sock.profilePictureUrl(jid, 'image')
            if (!url) return undefined
            const res = await axios.get<Buffer>(url, { responseType: 'arraybuffer' })
            return res.data
        } catch {
            return undefined
        }
    }

    /** Returns the user's status text. v7's fetchStatus returns USyncQueryResultList[]. */
    getStatus = async (jid: string): Promise<{ status?: string; setAt?: Date }> => {
        try {
            const result = await this.sock.fetchStatus(jid)
            const first = (result as Array<{ status?: { status?: string; setAt?: Date } }> | undefined)?.[0]
            return { status: first?.status?.status, setAt: first?.status?.setAt }
        } catch {
            return {}
        }
    }

    onWhatsApp = async (...jids: string[]): Promise<{ exists: boolean; jid: string }[]> => {
        const out = await this.sock.onWhatsApp(...jids)
        return (out || []).map((r) => ({ exists: !!r.exists, jid: r.jid }))
    }

    /** Best-effort port of legacy modifyAllChats. v7 has no in-memory chat list, so this only acts on chats observed during this session. */
    modifyAllChats = async (
        action: 'archive' | 'unarchive' | 'pin' | 'unpin' | 'mute' | 'unmute' | 'delete' | 'clear'
    ): Promise<{ status: 200 | 500 }> => {
        try {
            for (const jid of this.chats) {
                if (action === 'archive' || action === 'unarchive') {
                    await this.sock.chatModify(
                        { archive: action === 'archive', lastMessages: [] },
                        jid
                    )
                } else if (action === 'mute' || action === 'unmute') {
                    await this.sock.chatModify({ mute: action === 'mute' ? 8 * 60 * 60 * 1000 : null }, jid)
                } else if (action === 'pin' || action === 'unpin') {
                    await this.sock.chatModify({ pin: action === 'pin' }, jid)
                } else if (action === 'delete') {
                    await this.sock.chatModify({ delete: true, lastMessages: [] }, jid)
                } else if (action === 'clear') {
                    await this.sock.chatModify({ clear: true, lastMessages: [] }, jid)
                }
            }
            return { status: 200 }
        } catch {
            return { status: 500 }
        }
    }

    deleteMessage = async (jid: string, key: WAMessageKey): Promise<void> => {
        await this.sock.sendMessage(jid, { delete: key })
    }

    emitNewMessage = async (M: Promise<ISimplifiedMessage>): Promise<void> =>
        void this.emit('new-message', await M)

    /** Resolve a JID (possibly @lid) to its preferred (PN) form. */
    pnForm = (jid: string | null | undefined, fallback?: string | null): string => {
        if (!jid) return fallback || ''
        if (jid.endsWith('@lid') && fallback && !fallback.endsWith('@lid')) return fallback
        return jid
    }

    /** Are two JIDs the same user (handles LID/PN, device suffixes, server differences)? */
    sameUser = (a: string | undefined, b: string | undefined): boolean => areJidsSameUser(a, b)

    simplifyMessage = async (rawM: WAMessage): Promise<ISimplifiedMessage> => {
        const M = rawM
        // Use baileys's helper to peel ephemeral / viewOnce / documentWithCaption / etc. wrappers.
        const innerMessage = extractMessageContent(M.message) || M.message || {}
        // Use baileys's helper to identify the user-visible content type. This skips
        // protocolMessage / senderKeyDistributionMessage / reactionMessage / etc.
        const type = (getContentType(innerMessage) as string) || ''

        const remoteJid = M.key.remoteJid || ''
        const fromGroup = isJidGroup(remoteJid) === true
        const chat: 'group' | 'dm' = fromGroup ? 'group' : 'dm'
        const isFromMe = M.key.fromMe === true

        // Resolve sender. Keep whatever form WhatsApp gave us (LID or PN); the
        // group's own admins/participants are in the same form, so direct
        // comparisons work. We prefer key.participant even for fromMe in groups,
        // because that's the bot's JID *in the group's native form* — which is
        // what admins[] uses. Falling back to this.user.jid (always PN) would
        // break the admin check in LID-addressed groups.
        const senderRaw = fromGroup
            ? M.key.participant || (isFromMe ? this.user.jid : '')
            : isFromMe
              ? this.user.jid
              : remoteJid
        const sender = senderRaw ? jidNormalizedUser(senderRaw) : ''

        const info = this.getContact(sender)
        const groupMetadata: IExtendedGroupMetadata | null = fromGroup
            ? ((await this.cachedGroupMetadata(remoteJid)) as IExtendedGroupMetadata | undefined) ?? null
            : null
        if (groupMetadata) {
            groupMetadata.admins = groupMetadata.participants
                .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
                .map((p) => p.id)
        }

        // Admin check: direct match against the group's admin list (same form),
        // PLUS a cross-form match for the bot itself (since this.user.jid is
        // PN-form but admins[] in a LID group are LID-form).
        const senderIsAdmin = !!groupMetadata?.admins?.some(
            (j) => j === sender || (isFromMe && this.isMe(j))
        )

        const senderInfo = {
            jid: sender,
            username:
                info.notify ||
                info.vname ||
                info.name ||
                M.pushName ||
                M.verifiedBizName ||
                sender.split('@')[0] ||
                'User',
            isAdmin: senderIsAdmin
        }

        // Pull textual content from whichever shape this type is in.
        const msgVal = innerMessage as Record<string, { text?: string; caption?: string } | string | undefined>
        let content: string | null = null
        if (type === 'conversation') content = (msgVal.conversation as string) || null
        else if (type === 'extendedTextMessage')
            content = (msgVal.extendedTextMessage as { text?: string })?.text || null
        else if (type === 'imageMessage' || type === 'videoMessage' || type === 'documentMessage')
            content = (msgVal[type] as { caption?: string })?.caption || ''
        else content = null

        // Quoted message (works for both extendedTextMessage and media-with-caption).
        const ctxInfo = (msgVal[type] as { contextInfo?: proto.IContextInfo } | undefined)?.contextInfo
        const quotedMessage = ctxInfo?.quotedMessage
        const quotedSender = ctxInfo?.participant ? jidNormalizedUser(ctxInfo.participant) : null
        const quoted = {
            message: quotedMessage
                ? ({
                      key: {
                          remoteJid,
                          id: ctxInfo?.stanzaId || undefined,
                          participant: ctxInfo?.participant || undefined,
                          fromMe: this.isMe(ctxInfo?.participant ?? undefined)
                      } as WAMessageKey,
                      message: quotedMessage
                  } as WAMessage)
                : null,
            sender: quotedSender
        }

        const mentioned = (ctxInfo?.mentionedJid || []).filter((v): v is string => !!v)

        const args = (content || '').trim().split(/\s+/).filter(Boolean)
        const urls = this.util.getUrls(content || '')

        const reply: ISimplifiedMessage['reply'] = async (
            replyContent,
            replyType = MessageType.text,
            mime,
            mention,
            caption,
            thumbnail
        ) => {
            const payload = buildMessageContent(replyContent, replyType, mime, mention, caption, thumbnail)
            const sent = (await this.sock.sendMessage(remoteJid, payload, { quoted: M })) as
                | WAMessage
                | undefined
            this.trackSent(sent)
            return sent
        }

        return {
            type,
            content,
            chat,
            sender: senderInfo,
            quoted,
            args,
            reply,
            mentioned,
            from: remoteJid,
            groupMetadata,
            WAMessage: M,
            urls
        }
    }

    getContact = (jid: string): IContactInfo => this.contacts.get(jid) || {}

    /** Atomic upsert — eliminates the read-then-write race that throws E11000
     * when two concurrent messages from the same new user/group arrive. */
    getUser = async (jid: string): Promise<IUserModel> =>
        (await this.DB.user.findOneAndUpdate(
            { jid },
            { $setOnInsert: { jid } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )) as IUserModel

    getBuffer = async (url: string): Promise<Buffer> =>
        (await axios.get<Buffer>(url, { responseType: 'arraybuffer', timeout: 15_000 })).data

    fetch = async <T>(url: string): Promise<T> => (await axios.get<T>(url, { timeout: 15_000 })).data

    banUser = async (jid: string): Promise<void> => {
        await this.DB.user.findOneAndUpdate(
            { jid },
            { $set: { ban: true }, $setOnInsert: { jid } },
            { upsert: true, setDefaultsOnInsert: true }
        )
    }

    unbanUser = async (jid: string): Promise<void> => {
        await this.DB.user.findOneAndUpdate(
            { jid },
            { $set: { ban: false }, $setOnInsert: { jid } },
            { upsert: true, setDefaultsOnInsert: true }
        )
    }

    setXp = async (jid: string, min: number, max: number): Promise<void> => {
        const Xp = Math.floor(Math.random() * max) + min
        await this.DB.user.findOneAndUpdate(
            { jid },
            { $inc: { Xp }, $setOnInsert: { jid } },
            { upsert: true, setDefaultsOnInsert: true }
        )
    }

    getGroupData = async (jid: string): Promise<IGroupModel> =>
        (await this.DB.group.findOneAndUpdate(
            { jid },
            { $setOnInsert: { jid } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )) as IGroupModel

    getFeatures = async (feature: string): Promise<IFeatureModel> =>
        (await this.DB.feature.findOneAndUpdate(
            { feature },
            { $setOnInsert: { feature } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )) as IFeatureModel

    setFeatures = async (): Promise<void> => {
        const dbfeatures = await this.DB.feature.find()
        for (const feature of dbfeatures) this.features.set(feature.feature.toString(), feature.state)
    }

    isFeature = (feature: string): boolean => this.features.get(feature) || false

    setFeature = (feature: string, value: boolean): void => {
        this.features.set(feature, value)
    }
}

export enum toggleableGroupActions {
    events = 'events',
    NSFW = 'nsfw',
    safe = 'safe',
    mod = 'mod',
    cmd = 'cmd',
    invitelink = 'invitelink'
}
