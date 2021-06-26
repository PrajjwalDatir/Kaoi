import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'admins',
            description: 'Tags all Admins 🎖️',
            category: 'general',
            usage: `${client.config.prefix}admins (Message)`
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        return void (await M.reply(`ADMINS!\n[Tags Hidden]`, undefined, undefined, M.groupMetadata?.admins))
    }
}
