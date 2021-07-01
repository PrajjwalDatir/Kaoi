import { MessageType, Mimetype, WAConnection as Base, WAMessage } from '@adiwajshing/baileys'
import chalk from 'chalk'
import qrImage from 'qr-image'
import { existsSync, writeFileSync } from 'fs'
import moment from 'moment'
import { join } from 'path'
import { IConfig, IExtendedGroupMetadata, IGroupModel, ISession, ISimplifiedMessage, IUserModel } from '../typings'
import Utils from './Utils'
import DatabaseHandler from '../Handlers/DatabaseHandler'

export default class WAClient extends Base {
    assets = new Map<string, Buffer>()
    constructor(public config: IConfig) {
        super()
        this.browserDescription[0] = 'WhatsApp-Botto-Void'
        this.logger.level = 'fatal'

        this.on('chat-update', (update) => {
            if (!update.messages) return void null
            const messages = update.messages.all()
            if (!messages[0]) return void null
            this.emitNewMessage(this.simplifyMessage(messages[0]))
        })

        this.on('qr', (qr) => {
            this.log(
                chalk.redBright(
                    `Scan the QR code above to continue | You can also authenticate at http://localhost:${
                        process.env.PORT || 4000
                    }`
                )
            )
            this.QR = qrImage.imageSync(qr)
        })

        this.on('CB:action,,call', async (json) => this.emit('call', json[2][0][1].from))
    }

    DB = new DatabaseHandler()

    QR!: Buffer

    sendWA = async (message: string): Promise<unknown> => this.send(message)

    getAuthInfo = async (ID: string): Promise<ISession | null> => {
        if (existsSync(`./${ID}_session.json`)) return require(join(__dirname, '..', '..', `./${ID}_session.json`))
        const session = await this.DB.session.findOne({ ID })
        if (!session) return null
        return session.session
    }

    saveAuthInfo = async (ID: string): Promise<void> => {
        const session = await this.DB.session.findOne({ ID })
        if (!session) return void (await new this.DB.session({ ID, session: this.base64EncodedAuthInfo() }).save())
        writeFileSync(`./${ID}_session.json`, JSON.stringify(this.base64EncodedAuthInfo(), null, '\t'))
        this.log(chalk.green(`Saved AuthInfo!`))
        return void (await this.DB.session.updateOne({ ID }, { $set: { session: this.base64EncodedAuthInfo() } }))
    }

    emitNewMessage = async (M: Promise<ISimplifiedMessage>): Promise<void> => void this.emit('new-message', await M)

    supportedMediaMessages = [MessageType.image, MessageType.video]

    simplifyMessage = async (M: WAMessage): Promise<ISimplifiedMessage> => {
        if (M.message?.ephemeralMessage) M.message = M.message.ephemeralMessage.message
        const jid = M.key.remoteJid || ''
        const chat = jid.endsWith('g.us') ? 'group' : 'dm'
        const type = (Object.keys(M.message || {})[0] || '') as MessageType
        const user = chat === 'group' ? M.participant : jid
        const info = this.getContact(user)
        const groupMetadata: IExtendedGroupMetadata | null = chat === 'group' ? await this.groupMetadata(jid) : null
        if (groupMetadata)
            groupMetadata.admins = groupMetadata.participants.filter((user) => user.isAdmin).map((user) => user.jid)
        const sender = {
            jid: user,
            username: info.notify || info.vname || info.name || 'User',
            isAdmin: groupMetadata && groupMetadata.admins ? groupMetadata.admins.includes(user) : false
        }
        const content: string | null =
            type === MessageType.text && M.message?.conversation
                ? M.message.conversation
                : this.supportedMediaMessages.includes(type)
                ? this.supportedMediaMessages
                      .map((type) => M.message?.[type as MessageType.image | MessageType.video]?.caption)
                      .filter((caption) => caption)[0] || ''
                : type === MessageType.extendedText && M.message?.extendedTextMessage?.text
                ? M.message?.extendedTextMessage.text
                : null
        const quoted: ISimplifiedMessage['quoted'] = {}
        quoted.message = M?.message?.[type as MessageType.extendedText]?.contextInfo?.quotedMessage
            ? JSON.parse(JSON.stringify(M).replace('quotedM', 'm')).message?.[type as MessageType.extendedText]
                  .contextInfo
            : null
        quoted.sender = M.message?.[type as MessageType.extendedText]?.contextInfo?.participant || null
        return {
            type,
            content,
            chat,
            sender,
            quoted,
            args: content?.split(' ') || [],
            reply: async (
                content: string | Buffer,
                type?: MessageType,
                mime?: Mimetype,
                mention?: string[],
                caption?: string,
                thumbnail?: Buffer
            ) => {
                const options = {
                    quoted: M,
                    caption,
                    mimetype: mime,
                    contextInfo: { mentionedJid: mention }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (thumbnail) (options as any).thumbnail = thumbnail
                await this.sendMessage(jid, content, type || MessageType.text, options)
            },
            mentioned: this.getMentionedUsers(M, type),
            from: jid,
            groupMetadata,
            WAMessage: M,
            urls: this.util.getUrls(content || '')
        }
    }

    log = (text: string, error?: boolean): void => {
        console.log(
            chalk[error ? 'red' : 'green']('[VOID]'),
            chalk.blue(moment(Date.now() * 1000).format('DD/MM HH:mm:ss')),
            chalk.yellowBright(text)
        )
    }

    getMentionedUsers = (M: WAMessage, type: string): string[] => {
        const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue =>
            value !== null && value !== undefined
        const array = M?.message?.[type as MessageType.extendedText]?.contextInfo?.mentionedJid
            ? M?.message[type as MessageType.extendedText]?.contextInfo?.mentionedJid
            : []
        return (array || []).filter(notEmpty)
    }

    //eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    getContact = (jid: string) => {
        return this.contacts[jid] || {}
    }

    getUser = async (jid: string): Promise<IUserModel> => {
        let user = await this.DB.user.findOne({ jid })
        if (!user)
            user = await new this.DB.user({
                jid
            }).save()
        return user
    }

    banUser = async (jid: string): Promise<void> => {
        const result = await this.DB.user.updateOne({ jid }, { $set: { ban: true } })
        if (!result.nModified)
            await new this.DB.user({
                jid,
                ban: true
            }).save()
    }

    unbanUser = async (jid: string): Promise<void> => {
        const result = await this.DB.user.updateOne({ jid }, { $set: { ban: false } })
        if (!result.nModified)
            await new this.DB.user({
                jid,
                ban: false
            }).save()
    }

    setXp = async (jid: string, min: number, max: number): Promise<void> => {
        const Xp = Math.floor(Math.random() * max) + min
        const result = await this.DB.user.updateOne({ jid }, { $inc: { Xp } })
        if (!result.nModified)
            await new this.DB.user({
                jid,
                Xp
            }).save()
    }

    modifyAllChats = async (
        action: 'archive' | 'unarchive' | 'pin' | 'unpin' | 'mute' | 'unmute' | 'delete' | 'clear'
    ): Promise<{ status: 200 | 500 }> => {
        const chats = this.chats.all()
        this.setMaxListeners(25)
        try {
            for (const chat of chats) {
                await this.modifyChat(chat.jid, action)
            }
            return { status: 200 }
        } catch (err) {
            return { status: 500 }
        }
    }

    util = new Utils()

    getGroupData = async (jid: string): Promise<IGroupModel> =>
        (await this.DB.group.findOne({ jid })) || (await new this.DB.group({ jid }).save())
}

export enum toggleableGroupActions {
    events = 'events',
    NSFW = 'nsfw',
    safe = 'safe',
    mod = 'mod'
}
