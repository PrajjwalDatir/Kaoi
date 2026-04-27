import { MessageType, Mimetype } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import YT from '../../lib/YT.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'ytvideo',
            description: 'Downloads given YT Video',
            category: 'media',
            aliases: ['ytv'],
            usage: `${client.config.prefix}ytv [URL]`,
            baseXp: 10
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!M.urls.length) return void M.reply('🔎 Provide the URL of the YT video you want to download')
        const video = new YT(M.urls[0], 'video')
        if (!video.validateURL()) return void M.reply(`Provide a Valid YT URL`)
        let info
        try {
            info = await video.getInfo()
        } catch (reason) {
            return void M.reply(`❌ Couldn't fetch video info: ${(reason as Error).message}`)
        }
        M.reply('👾 sending...')
        if (Number(info.duration) > 1800) return void M.reply('⚓ Cannot download videos longer than 30 minutes')
        try {
            const buffer = await video.getBuffer()
            await M.reply(buffer, MessageType.video)
        } catch (reason) {
            M.reply(`❌ an error occurred, Reason: ${(reason as Error).message}`)
        }
    }
}
