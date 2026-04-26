import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'admins',
            description: 'Tags all Admins 🎖️',
            category: 'general',
            usage: `${client.config.prefix}admins (Message)`,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        return void (await M.reply(`ADMINS!\n[Tags Hidden]`, undefined, undefined, M.groupMetadata?.admins).catch(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (reason: any) => M.reply(`an error occurred, Reason: ${reason}`)
        ))
    }
}
