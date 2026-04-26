import MessageHandler from '../Handlers/MessageHandler.js'
import BaseCommand from '../lib/BaseCommand.js'
import WAClient from '../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'command_goes_here',
            description: 'command description',
            category: 'category',
            usage: `${client.config.prefix}command`
        })
    }

    //eslint-disable-next-line
    run = async (M: ISimplifiedMessage, args: IParsedArgs): Promise<void> => {}
}
