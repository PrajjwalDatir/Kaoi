import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'
import request from '../../lib/request.js'
import { MessageType } from '../../lib/types.js'

interface NekosBest {
    results: { url: string; artist_name?: string; source_url?: string }[]
}

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'husbando',
            description: `Will send you a random husbando image.`,
            aliases: ['husbu'],
            category: 'anime',
            usage: `${client.config.prefix}husbu`,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        try {
            const data = await request.json<NekosBest>('https://nekos.best/api/v2/husbando')
            const url = data.results?.[0]?.url
            if (!url) return void M.reply('Could not fetch image. Try again later.')
            const buffer = await request.buffer(url)
            await M.reply(buffer, MessageType.image, undefined, undefined, `Here you go ✨`)
        } catch (err) {
            await M.reply(`Could not fetch husbando image right now.`)
        }
    }
}
