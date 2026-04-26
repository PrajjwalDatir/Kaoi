import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'loli',
            description: 'Disabled — upstream image source no longer available',
            category: 'anime',
            usage: `${client.config.prefix}loli`
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        return void M.reply('This command has been disabled (image source went offline).')
    }
}
