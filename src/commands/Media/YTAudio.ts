import { MessageType, Mimetype } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import YT from '../../lib/YT.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'ytaudio',
            description: 'Downloads given YT Video and sends it as Audio',
            category: 'media',
            aliases: ['yta'],
            usage: `${client.config.prefix}ytv [URL]`,
            baseXp: 20
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!M.urls.length) return void M.reply('🔎 Provide the URL of the YT video you want to download')
        const audio = new YT(M.urls[0], 'audio')
        if (!audio.validateURL()) return void M.reply(`⚓ Provide a Valid YT URL`)
        M.reply('👾 sending...')
        try {
            const buffer = await audio.getBuffer()
            await M.reply(buffer, MessageType.audio, Mimetype.m4a)
        } catch (reason) {
            M.reply(`❌ an error occurred, Reason: ${(reason as Error).message}`)
        }
    }
}
