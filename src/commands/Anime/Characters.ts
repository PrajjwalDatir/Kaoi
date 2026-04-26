import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'
import request, { firstOk } from '../../lib/request.js'
import { MessageType } from '../../lib/types.js'

const SUPPORTED = ['neko', 'shinobu', 'megumin', 'awoo'] as const

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
        const term = joined.trim().split(' ')[0].toLowerCase()
        const text = SUPPORTED.map((c) => `📍${c.charAt(0).toUpperCase() + c.slice(1)}`).join('\n')
        if (!term)
            return void M.reply(
                `🪧 *OPTIONS:*\n${text}\nUse ${this.client.config.prefix}ac (option) to get Characters\nExample: ${this.client.config.prefix}ac neko`
            )
        if (!SUPPORTED.includes(term as (typeof SUPPORTED)[number]))
            return void M.reply(
                `🧧 Invalid option! 🧧\nUse ${this.client.config.prefix}ac to see all available options`
            )

        const urlResult = await firstOk<string>([
            async () => (await request.json<{ url: string }>(`https://api.waifu.pics/sfw/${term}`)).url,
            async () =>
                (await request.json<{ results: { url: string }[] }>(`https://nekos.best/api/v2/${term}`))
                    .results?.[0]?.url
        ])
        if (!urlResult.ok || !urlResult.value)
            return void M.reply(`Could not fetch a *${term}* image right now.`)

        try {
            const buffer = await request.buffer(urlResult.value)
            await M.reply(buffer, MessageType.image, undefined, undefined, 'Here you go.')
        } catch {
            await M.reply(`Could not fetch image. Here's the URL: ${urlResult.value}`)
        }
    }
}
