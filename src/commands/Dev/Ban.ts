import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'ban',
            description: 'Bans the tagged users',
            category: 'dev',
            usage: `${client.config.prefix}ban [@tag]`
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!this.client.config.mods?.includes(M.sender.jid)) return void M.reply('❌ Only available to MODS')
        // Can't ban the BOT, MODS
        const immortals = [M.sender.jid, this.client.user.jid, ...this.client.config.mods]
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        if (!M.mentioned.length || !M.mentioned[0]) return void M.reply('Mention the user whom you want to ban')
        let text = '*STATE*\n\n'
        // declare tagged as (string | undefined) []
        // const tagged : (string | undefined)[] = []
        for (const user of M.mentioned) {
            if (immortals.includes(user)) {
                // tagged.push(user)
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
