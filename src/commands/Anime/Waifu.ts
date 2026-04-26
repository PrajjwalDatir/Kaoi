import { MessageType } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import request, { firstOk } from '../../lib/request.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'waifu',
            description: `Sends a random waifu image.`,
            aliases: ['animegirl'],
            category: 'anime',
            usage: `${client.config.prefix}waifu`,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        const urlResult = await firstOk<string>([
            async () => (await request.json<{ url: string }>('https://api.waifu.pics/sfw/waifu')).url,
            async () =>
                (await request.json<{ results: { url: string }[] }>('https://nekos.best/api/v2/waifu'))
                    .results?.[0]?.url
        ])
        if (!urlResult.ok || !urlResult.value)
            return void M.reply('Could not fetch a waifu image right now.')
        try {
            const buffer = await request.buffer(urlResult.value)
            await M.reply(
                buffer,
                MessageType.image,
                undefined,
                undefined,
                'More than one waifu, will ruin your laifu.'
            )
        } catch {
            await M.reply(`Could not download the image — try again.`)
        }
    }
}
