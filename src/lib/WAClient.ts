import { EventEmitter } from 'events'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { Boom } from '@hapi/boom'
import chalk from 'chalk'
import moment from 'moment'
import qrcode from 'qrcode'
import axios from 'axios'
import pino from 'pino'
import {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    Browsers,
    DisconnectReason,
    downloadMediaMessage as baileysDownloadMediaMessage,
    jidNormalizedUser,
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
    contacts = new Map<string, IContactInfo>() as Map<string, IContactInfo> & {
        [jid: string]: IContactInfo
    }
    chats = new Set<string>()
    messageCache = new Map<string, WAMessageContent>()
    state: ConnectionStatus = 'connecting'
    QR?: Buffer
    private logger = pino({ level: process.env.LOG_LEVEL || 'fatal' })
    private user_: { id: string; jid: string; name?: string; lid?: string } | null = null

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

    get user(): { jid: string; id: string; name?: string; notify?: string; vname?: string; short?: string } {
        const id = this.user_?.jid || this.user_?.id || ''
        return {
            id,
            jid: id,
            name: this.user_?.name,
            notify: this.user_?.name,
            vname: this.user_?.name,
            short: this.user_?.name?.split(' ')[0]
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
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            markOnlineOnConnect: true
        })

        this.sock.ev.on('creds.update', saveCreds)

        this.sock.ev.on('connection.update', (update) => this.handleConnectionUpdate(update))

        this.sock.ev.on('messages.upsert', ({ messages, type }) => {
            if (type !== 'notify' && type !== 'append') return
            for (const m of messages) {
                if (!m.message) continue
                if (m.key.id) {
                    this.messageCache.set(m.key.id, m.message)
                    if (this.messageCache.size > 500) {
                        const first = this.messageCache.keys().next().value
                        if (first) this.messageCache.delete(first)
                    }
                }
                if (m.key.remoteJid) this.chats.add(m.key.remoteJid)
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
                ;(this.contacts as Record<string, IContactInfo>)[c.id] = this.contacts.get(c.id) || {}
            }
        })
        this.sock.ev.on('contacts.update', (contacts) => {
            for (const c of contacts) {
                if (!c.id) continue
                const existing = this.contacts.get(c.id) || {}
                const updated: IContactInfo = {
                    ...existing,
                    notify: c.notify || c.name || existing.notify,
                    name: c.name || existing.name,
                    vname: c.verifiedName || existing.vname
                }
                this.contacts.set(c.id, updated)
                ;(this.contacts as Record<string, IContactInfo>)[c.id] = updated
            }
        })

        this.sock.ev.on('chats.upsert', (chats) => {
            for (const c of chats) if (c.id) this.chats.add(c.id)
        })

        this.sock.ev.on('group-participants.update', (event) => {
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
            this.user_ = {
                id,
                jid: id,
                name: this.sock.user?.name,
                lid: (this.sock.user as { lid?: string })?.lid
            }
            this.QR = undefined
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
            if (shouldReconnect) setTimeout(() => this.connect().catch((e) => this.log(String(e), true)), 1500)
        }
    }

    // Required by makeWASocket for poll decryption + retry resends.
    private getMessage = async (key: WAMessageKey): Promise<WAMessageContent | undefined> => {
        if (key.id && this.messageCache.has(key.id)) return this.messageCache.get(key.id)
        return proto.Message.fromObject({})
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
        const sent = await this.sock.sendMessage(jid, payload, { quoted: options.quoted })
        return (sent as WAMessage | undefined) ?? undefined
    }

    downloadMediaMessage = async (message: WAMessage): Promise<Buffer> => {
        const buffer = await baileysDownloadMediaMessage(message, 'buffer', {})
        return buffer as Buffer
    }

    groupMetadata = async (jid: string): Promise<GroupMetadata> => this.sock.groupMetadata(jid)

    fetchGroupMetadataFromWA = async (jid: string): Promise<GroupMetadata> => this.sock.groupMetadata(jid)

    groupRemove = async (jid: string, users: string[]): Promise<unknown> =>
        this.sock.groupParticipantsUpdate(jid, users, 'remove')

    groupPromote = async (jid: string, users: string[]): Promise<unknown> =>
        this.sock.groupParticipantsUpdate(jid, users, 'promote')

    groupDemote = async (jid: string, users: string[]): Promise<unknown> =>
        this.sock.groupParticipantsUpdate(jid, users, 'demote')

    groupAdd = async (jid: string, users: string[]): Promise<unknown> =>
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

    /** Legacy alias for groupParticipantsUpdate(..., 'promote') */
    groupMakeAdmin = async (jid: string, users: string[]): Promise<unknown> => this.groupPromote(jid, users)

    /** Legacy alias for groupParticipantsUpdate(..., 'demote') */
    groupDemoteAdmin = async (jid: string, users: string[]): Promise<unknown> => this.groupDemote(jid, users)

    /** Legacy alias for groupAcceptInvite. Returns a shape compatible with the old `{ status, gid }`. */
    acceptInvite = async (code: string): Promise<{ status: number; gid?: string }> => {
        try {
            const gid = await this.sock.groupAcceptInvite(code)
            return { status: 200, gid }
        } catch {
            return { status: 401 }
        }
    }

    // Translate legacy `groupSettingChange(jid, GroupSettingChange.messageSend, true|false)`.
    // value=true → close (announcement), value=false → open (not_announcement).
    groupSettingChange = async (jid: string, _setting: string, value: boolean): Promise<void> => {
        await this.sock.groupSettingUpdate(jid, value ? 'announcement' : 'not_announcement')
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

    getStatus = async (jid: string): Promise<{ status?: string; setAt?: Date }> => {
        try {
            const out = await this.sock.fetchStatus(jid)
            const status = (out as { status?: { status?: string; setAt?: Date } } | undefined)?.status
            return { status: status?.status, setAt: status?.setAt }
        } catch {
            return {}
        }
    }

    onWhatsApp = async (
        ...jids: string[]
    ): Promise<{ exists: boolean; jid: string }[]> => {
        const out = await this.sock.onWhatsApp(...jids)
        return (out || []).map((r) => ({ exists: !!r.exists, jid: r.jid }))
    }

    /** Best-effort port of legacy modifyAllChats. v7 has no in-memory chat list, so this only acts on chats observed during this session. */
    modifyAllChats = async (
        action: 'archive' | 'unarchive' | 'pin' | 'unpin' | 'mute' | 'unmute' | 'delete' | 'clear'
    ): Promise<{ status: 200 | 500 }> => {
        try {
            for (const jid of this.chats) {
                const lastMsg = [...this.messageCache.entries()]
                    .reverse()
                    .find(([, _msg]) => true)
                if (action === 'archive' || action === 'unarchive') {
                    await this.sock.chatModify(
                        {
                            archive: action === 'archive',
                            lastMessages: lastMsg
                                ? [{ key: { remoteJid: jid, id: lastMsg[0] }, messageTimestamp: Date.now() }]
                                : []
                        },
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

    /** Resolve a JID to its phone-number form. v7 introduces @lid identifiers; this returns the @s.whatsapp.net equivalent when available. */
    pnForm = (jid: string | null | undefined, fallback?: string | null): string => {
        if (!jid) return fallback || ''
        if (jid.endsWith('@lid') && fallback && !fallback.endsWith('@lid')) return fallback
        return jid
    }

    private supportedMediaMessages: string[] = [MessageType.image, MessageType.video]

    simplifyMessage = async (M: WAMessage): Promise<ISimplifiedMessage> => {
        if (M.message?.ephemeralMessage) M.message = M.message.ephemeralMessage.message
        const key = M.key
        const jid = key?.remoteJid || ''
        const chat: 'group' | 'dm' = jid.endsWith('g.us') ? 'group' : 'dm'
        const type = (Object.keys(M.message || {})[0] || '') as string
        const senderRaw = chat === 'group' ? key?.participant || '' : jid
        const senderAlt = (key as { participantAlt?: string; remoteJidAlt?: string })
        const sender = this.pnForm(
            senderRaw,
            chat === 'group' ? senderAlt.participantAlt : senderAlt.remoteJidAlt
        )
        const info = this.getContact(sender)
        const groupMetadata: IExtendedGroupMetadata | null =
            chat === 'group' ? ((await this.groupMetadata(jid).catch(() => null)) as IExtendedGroupMetadata | null) : null
        if (groupMetadata) {
            groupMetadata.admins = groupMetadata.participants
                .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
                .map((p) => p.id)
        }
        const senderInfo = {
            jid: sender,
            username: info.notify || info.vname || info.name || M.pushName || 'User',
            isAdmin: groupMetadata && groupMetadata.admins ? groupMetadata.admins.includes(sender) : false
        }
        const msg = M.message || {}
        const content: string | null =
            type === MessageType.text && msg.conversation
                ? msg.conversation
                : this.supportedMediaMessages.includes(type)
                ? this.supportedMediaMessages
                      .map((t) => (msg as Record<string, { caption?: string }>)[t]?.caption)
                      .filter((c): c is string => !!c)[0] || ''
                : type === MessageType.extendedText && msg.extendedTextMessage?.text
                ? msg.extendedTextMessage.text
                : null
        const quotedRef = (msg as Record<string, { contextInfo?: proto.IContextInfo }>)[type]?.contextInfo
        const quotedMessage = quotedRef?.quotedMessage
        const quoted = {
            message: quotedMessage
                ? ({
                      key: {
                          remoteJid: jid,
                          id: quotedRef?.stanzaId,
                          participant: quotedRef?.participant,
                          fromMe: false
                      },
                      message: quotedMessage
                  } as WAMessage)
                : null,
            sender: quotedRef?.participant || null
        }
        const reply: ISimplifiedMessage['reply'] = async (
            content,
            type = MessageType.text,
            mime,
            mention,
            caption,
            thumbnail
        ) => {
            const payload = buildMessageContent(content, type, mime, mention, caption, thumbnail)
            return this.sock.sendMessage(jid, payload, { quoted: M })
        }
        return {
            type,
            content,
            chat,
            sender: senderInfo,
            quoted,
            args: content?.split(' ') || [],
            reply,
            mentioned: this.getMentionedUsers(M, type),
            from: jid,
            groupMetadata,
            WAMessage: M,
            urls: this.util.getUrls(content || '')
        }
    }

    getMentionedUsers = (M: WAMessage, type: string): string[] => {
        const ctx = (M?.message as Record<string, { contextInfo?: proto.IContextInfo }> | undefined)?.[type]
            ?.contextInfo
        return (ctx?.mentionedJid || []).filter((v): v is string => !!v)
    }

    getContact = (jid: string): IContactInfo => this.contacts.get(jid) || {}

    getUser = async (jid: string): Promise<IUserModel> => {
        let user = await this.DB.user.findOne({ jid })
        if (!user) user = await new this.DB.user({ jid }).save()
        return user
    }

    getBuffer = async (url: string): Promise<Buffer> =>
        (await axios.get<Buffer>(url, { responseType: 'arraybuffer' })).data

    fetch = async <T>(url: string): Promise<T> => (await axios.get<T>(url)).data

    banUser = async (jid: string): Promise<void> => {
        const result = await this.DB.user.updateOne({ jid }, { $set: { ban: true } })
        if (!result.modifiedCount) await new this.DB.user({ jid, ban: true }).save()
    }

    unbanUser = async (jid: string): Promise<void> => {
        const result = await this.DB.user.updateOne({ jid }, { $set: { ban: false } })
        if (!result.modifiedCount) await new this.DB.user({ jid, ban: false }).save()
    }

    setXp = async (jid: string, min: number, max: number): Promise<void> => {
        const Xp = Math.floor(Math.random() * max) + min
        const result = await this.DB.user.updateOne({ jid }, { $inc: { Xp } })
        if (!result.modifiedCount) await new this.DB.user({ jid, Xp }).save()
    }

    getGroupData = async (jid: string): Promise<IGroupModel> =>
        (await this.DB.group.findOne({ jid })) || (await new this.DB.group({ jid }).save())

    getFeatures = async (feature: string): Promise<IFeatureModel> =>
        (await this.DB.feature.findOne({ feature })) || (await new this.DB.feature({ feature }).save())

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
