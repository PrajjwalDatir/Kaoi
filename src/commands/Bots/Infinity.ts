import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'infinity',
            description: 'Displays the info',
            category: 'bots',
            usage: `${client.config.prefix}infinity`,
            baseXp: 100
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        return void M.reply(
            `👾 *Infinity* 👾\n\n🍀 *Description:* The Multi-purpose Bot With Biggest User Base\n\n🌐 *URL:* https://github.com/AlenSaito1/Whatsapp-Botto-Infinity\n`
        ).catch((reason: Error) => M.reply(`an error occurred, Reason: ${reason}`))
    }
}
