import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'
import axios from 'axios'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'joke',
            description: 'sends a random joke for you.',
            category: 'fun',
            usage: `${client.config.prefix}joke`,
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        await axios
            .get(`https://v2.jokeapi.dev/joke/Any`, { timeout: 15_000 })
            .then((response) => {
                // console.log(response);
                const text = `📝 *Catagory:* ${response.data.category}\n\n*🎃 Joke:* ${response.data.setup}\n\n*💡 Answer:* ${response.data.delivery}`
                M.reply(text)
            })
            .catch((err) => {
                M.reply(`🔍 Error: ${err}`)
            })
    }
}
