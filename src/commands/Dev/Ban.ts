import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'ban',
            description: 'Bans the tagged users globally',
            category: 'dev',
            usage: `${client.config.prefix}ban [@tag]`,
            modsOnly: true,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        if (!M.mentioned.length || !M.mentioned[0]) return void M.reply('Mention the user whom you want to ban')
        let text = '*STATE*\n\n'
        const isImmortal = (jid: string): boolean =>
            jid === M.sender.jid || this.client.isMe(jid) || this.client.isMod(jid)
        for (const user of M.mentioned) {
            if (isImmortal(user)) {
                text += `🟨 @${user.split('@')[0]} is an immortal, can't be banned\n`
                continue
            }
            const data = await this.client.getUser(user)
            // const info = this.client.getContact(user)
            // const username = info.notify || info.vname || info.name || user.split('@')[0]
            // const username = user.split('@')[0]
            if (data?.ban) {
                text += `🟨 @${user.split('@')[0]}: Already Banned\n`
                continue
            }
            await this.client.banUser(user)
            text += `🟥 @${user.split('@')[0]}: Banned\n`
        }
        await M.reply(
            `${text}`,
            undefined,
            undefined,
            // undefined
            [...M.mentioned, M.sender.jid]
        )
    }
}
