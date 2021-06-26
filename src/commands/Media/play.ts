import { MessageType } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import yts from 'yt-search'
import YT from '../../lib/YT'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'play',
            description: '🎵 play a song with just search term!',
            category: 'media',
            aliases: ['music'],
            usage: `${client.config.prefix}play [term]`,
            dm: true,
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void M.reply('Please provide a search term')
        const term = joined.trim()
        const { videos } = await yts(term)
        if (!videos || videos.length <= 0) return void M.reply(`No Matching videos found for the term : *${term}*`)
        const audio = new YT(videos[0].url, 'audio')
        M.reply(await audio.getBuffer(), MessageType.audio).catch(() => M.reply('An error occurred...'))

    }
}
