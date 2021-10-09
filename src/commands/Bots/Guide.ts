import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'guide',
            description: 'Lists All Kaoi Guides',
            category: 'bots',
            usage: `${client.config.prefix}guide`,
            baseXp: 200
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        return void M.reply(`👾 To Be Updated Soon ... 👾`).catch((reason: Error) =>
            M.reply(`an error occurred, Reason: ${reason}`)
        )
    }
}
