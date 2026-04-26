import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'entropy',
            description: 'Displays the info',
            category: 'bots',
            usage: `${client.config.prefix}entropy`,
            baseXp: 100
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        return void M.reply(
            `👾 *Entropy* 👾\n\n🍀 *Description:* The Only WhatsApp Bot With Multi-Device Support\n\n🌐 *URL:* https://github.com/Synthesized-Infinity/Whatsapp-Botto-Entropy\n`
        ).catch((reason: Error) => M.reply(`an error occurred, Reason: ${reason}`))
    }
}
