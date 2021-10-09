import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import axios from 'axios'
import request from '../../lib/request'
import { MessageType } from '@adiwajshing/baileys'
// import { MessageType, Mimetype } from '@adiwajshing/baileys'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'animechar',
            description: `Anime characters ;)\nType ${client.config.prefix}ac to check all available options`,
            aliases: ['ac', 'achar'],
            category: 'anime',
            usage: `${client.config.prefix}ac (option)`,
            baseXp: 20
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        // consider neko and kitsune in furry
        const char = ['neko', 'shinobu', 'megumin', 'awoo']
        const term = joined.trim().split(' ')[0].toLowerCase()
        let text = ''
        char.map((c) => {
            text += `📍${c.charAt(0).toUpperCase() + c.slice(1)}\n`
            // index % 4 === 3 ? (text += '\n') : (text += ' '.repeat(10 - c.length))
        })
        if (!term)
            return void M.reply(
                `🪧 *OPTIONS:*\n${text}Use ${this.client.config.prefix}ac (option) to get Characters\nExample: ${this.client.config.prefix}ac neko`
            )
        if (!char.includes(term))
            return void M.reply(
                `🧧 Invalid option! 🧧\nUse ${this.client.config.prefix}ac to see all available options`
            )

        // fetch result of https://waifu.pics/api/sfw from the API using axios
        const { data } = await axios.get(`https://waifu.pics/api/sfw/${term}`)
        const buffer = await request.buffer(data.url).catch((e) => {
            return void M.reply(e.message)
        })
        while (true) {
            try {
                M.reply(
                    buffer || 'Could not fetch image. Please try again later',
                    MessageType.image,
                    undefined,
                    undefined,
                    `Here you go.\n`,
                    undefined
                ).catch((e) => {
                    console.log(`This Error occurs when an image is sent via M.reply()\n Child Catch Block : \n${e}`)
                    // console.log('Failed')
                    M.reply(`Could not fetch image. Here's the URL: ${data.url}`)
                })
                break
            } catch (e) {
                // console.log('Failed2')
                M.reply(`Could not fetch image. Here's the URL : ${data.url}`)
                console.log(`This Error occurs when an image is sent via M.reply()\n Parent Catch Block : \n${e}`)
            }
        }
        return void null
    }
}
