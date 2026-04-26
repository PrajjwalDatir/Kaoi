import { MessageType } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'
import yts from 'yt-search'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'ytsearch',
            description: 'Searches YT',
            category: 'media',
            aliases: ['yts'],
            usage: `${client.config.prefix}yts [term]`,
            baseXp: 20
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void M.reply('🔎 Provide a search term')
        const term = joined.trim()
        const { videos } = await yts(term)
        if (!videos || videos.length <= 0) return void M.reply(`⚓ No Matching videos found for : *${term}*`)
        const length = videos.length < 10 ? videos.length : 10
        let text = `🔎 *Results for ${term}*\n`
        for (let i = 0; i < length; i++) {
            text += `*#${i + 1}*\n📗 *Title:* ${videos[i].title}\n📕 *Channel:* ${
                videos[i].author.name
            }\n 📙 *Duration:* ${videos[i].duration}\n📘 *URL:* ${videos[i].url}\n\n`
        }
        M.reply('👾 searching...')
        this.client
            .sendMessage(M.from, text, MessageType.extendedText, {
                quoted: M.WAMessage,
                contextInfo: {
                    externalAdReply: {
                        title: `Search Term: ${term}`,
                        body: `👾Handcrafted for you by Kaoi👾`,
                        mediaType: 2,
                        thumbnailUrl: videos[0].thumbnail,
                        mediaUrl: videos[0].url
                    }
                }
            })
            .catch((reason: any) => M.reply(`❌ an error occurred, Reason: ${reason}`))
    }
}
