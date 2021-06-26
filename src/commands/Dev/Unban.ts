import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'unban',
            description: 'Unbans the tagged users',
            category: 'dev',
            usage: `${client.config.prefix}unban [@tag]`
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!this.client.config.mods?.includes(M.sender.jid)) return void null
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        if (!M.mentioned.length || !M.mentioned[0])
            return void M.reply('Please mention the user whom you want to unban')
        let text = '*STATE*\n\n'
        for (const user of M.mentioned) {
            const data = await this.client.getUser(user)
            const info = this.client.getContact(user)
            const username = info.notify || info.vname || info.name || user.split('@')[0]
            if (!data?.ban) {
                text += `🟨 ${username}: Not Banned\n`
                continue
            }
            await this.client.unbanUser(user)
            text += `🟩 ${username}: Unbanned\n`
        }
        M.reply(text)
    }
}
