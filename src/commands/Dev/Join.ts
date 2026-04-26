import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'join',
            description: 'Bot Joins the group',
            category: 'dev',
            dm: true,
            usage: `${client.config.prefix}join`,
            modsOnly: true,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!M.urls.length) return void M.reply('Link?')
        const url = M.urls.find((u) => u.includes('chat.whatsapp.com'))
        if (!url) return void M.reply('No WhatsApp Invite URLs found in your message')
        if (!this.client.isMod(M.sender.jid)) return
        const groups = Array.from(this.client.chats).filter((jid) => jid.endsWith('@g.us'))
        const code = url.split('/').pop() || ''
        const { status, gid } = await this.client.acceptInvite(code)
        if (status === 401 || !gid) return void M.reply('Cannot join group. Maybe, I was removed from there before')
        if (groups.includes(gid)) return void M.reply('Already there')
        const meta = await this.client.fetchGroupMetadataFromWA(gid).catch(() => null)
        return void M.reply(`Joined ${meta?.subject || gid}`)
    }
}
