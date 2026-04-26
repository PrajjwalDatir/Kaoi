import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'kaoi',
            description: 'Displays the info',
            category: 'bots',
            usage: `${client.config.prefix}kaoi`,
            baseXp: 200
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        return void M.reply(
            `👾 *kaoi* 👾\n\n🍀 *Description:* Maintained Fork of WhatsApp Botto Void\n\n🌐 *URL:* https://github.com/PrajjwalDatir/Kaoi \n`
        ).catch((reason: Error) => M.reply(`an error occurred, Reason: ${reason}`))
    }
}
