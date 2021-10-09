import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'infinity',
            description: 'Displays the info',
            category: 'bots',
            usage: `${client.config.prefix}infinity`,
            baseXp: 100,
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        return void M.reply(
            `👾 *Infinity* 👾\n\n🍀 *Description:* The Multi-purpose Bot With Biggest User Base\n\n🌐 *URL:* https://github.com/AlenSaito1/Whatsapp-Botto-Infinity\n`
        ).catch((reason: Error) => M.reply(`an error occurred, Reason: ${reason}`))
    }
}
