import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'
import axios from 'axios'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'why',
            description: 'random question.',
            aliases: ['w'],
            category: 'fun',
            usage: `${client.config.prefix}why`
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        await axios.get(`https://nekos.life/api/v2/why`)
        .then((response) => {
                // console.log(response);
                const text = `📝 *Question:* ${response.data.why}`
                M.reply(text);
            }).catch(err => {
                M.reply(`🔍 Error: ${err}`)
            }
            )
    };
}
