import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'quote',
            description: 'random quote.',
            aliases: ['qu'],
            category: 'fun',
            usage: `${client.config.prefix}quote`,
            baseXp : 30,
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        // load JSON
        const quotes = JSON.parse((this.client.assets.get('quotes') as Buffer).toString()) as unknown as {
            quotes: {
                _id: string
                content: string
                author: string
            }[]
        }
        if (!quotes) return void null
        // select a random quote
        const quote = quotes.quotes[Math.floor(Math.random() * quotes.quotes.length)]
        const text = `📝 *Content:* ${quote.content}\n\n*✍️ Author:* ${quote.author}`
        M.reply(text)
    }
}
