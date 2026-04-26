import { MessageType } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'
import yts from 'yt-search'
import YT from '../../lib/YT.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'play',
            description: '🎵 play a song with just search term!',
            category: 'media',
            aliases: ['music'],
            usage: `${client.config.prefix}play [term]`,
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void M.reply('🔎 Provide a search term')
        const term = joined.trim()
        const { videos } = await yts(term)
        if (!videos || videos.length <= 0) return void M.reply(`⚓ No Matching videos found for the term : *${term}*`)
        const audio = new YT(videos[0].url, 'audio')
        if (!audio.url) return
        M.reply('👾 Sending...')
        this.client
            .sendMessage(M.from, await audio.getBuffer(), MessageType.audio, {
                quoted: M.WAMessage,
                contextInfo: {
                    externalAdReply: {
                        title: videos[0].title.substr(0, 30),
                        body: `author : ${videos[0].author.name.substr(0, 20)}\nSent Via : Kaoi`,
                        mediaType: 2,
                        thumbnailUrl: `https://i.ytimg.com/vi/${audio.id}/hqdefault.jpg`,
                        mediaUrl: audio.url
                    }
                }
            })
            .catch((reason: Error) => M.reply(`❌ an error occurred, Reason: ${reason}`))
    }
}
