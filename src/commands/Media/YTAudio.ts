import { MessageType } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import YT from '../../lib/YT'
import { ISimplifiedMessage } from '../../typings'

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
        M.reply(await audio.getBuffer(), MessageType.audio).catch((reason: Error) =>
            M.reply(`❌ an error occurred, Reason: ${reason}`)
        )
    }
}
