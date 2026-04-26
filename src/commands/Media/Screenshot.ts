import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'
import request from '../../lib/request.js'
import { MessageType } from '../../lib/types.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'screenshot',
            aliases: ['ss', 'ssweb'],
            description: 'Returns a screenshot of the given URL',
            category: 'media',
            usage: `${client.config.prefix}screenshot [url]`,
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void (await M.reply(`Please provide the url`))
        let url = joined.trim()
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`

        try {
            // microlink redirects directly to the screenshot PNG when embed=screenshot.url
            const buffer = await request.buffer(
                `https://api.microlink.io/?url=${encodeURIComponent(
                    url
                )}&screenshot=true&meta=false&embed=screenshot.url`
            )
            await M.reply(buffer, MessageType.image, undefined, undefined, `🌟 ${url}`)
        } catch (e) {
            await M.reply(
                `✖ Couldn't capture that page. The site may block automated screenshots, or the URL is invalid.`
            )
        }
    }
}
