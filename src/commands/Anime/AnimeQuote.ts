import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'
import axios from 'axios'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'animequote',
            description: 'random anime quote.',
            aliases: ['aq'],
            category: 'anime',
            usage: `${client.config.prefix}animequote`,
            baseXp: 10
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        await axios
            .get(`https://animechan.vercel.app/api/random`)
            .then((response) => {
                // console.log(response);
                const text = `⛩ *Anime:* ${response.data.anime}\n\n*🎎 Character:* ${response.data.character}\n\n*✏ Quote:* ${response.data.quote}`
                M.reply(text)
            })
            .catch((err) => {
                M.reply(`🔍 Error: ${err}`)
            })
    }
}
