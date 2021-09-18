import { MessageType } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import redditFetcher, { IRedditResponse } from '../../lib/redditFetcher'
import request from '../../lib/request'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'subred',
            description: 'Fetches post from reddit',
            aliases: ['sr', 'reddit'],
            category: 'utils',
            usage: `${client.config.prefix}subred [subredit_name]`,
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void (await M.reply(`Please provide the subreddit you want to fetch`))
        const response = await redditFetcher(joined.toLowerCase().trim())
        if ((response as { error: string }).error) return void (await M.reply('Invalid Subreddit'))
        const res = response as IRedditResponse
        if (res.nsfw && !(await this.client.getGroupData(M.from)).nsfw)
            return void M.reply(
                `Cannot Display NSFW content before enabling. Use ${this.client.config.prefix}activate nsfw to activate nsfw`
            )
        const notFound = this.client.assets.get('404')
        const buffer = await request.buffer(res.url).catch((e) => {
            if (e.message.includes('marker not found')) {
                this.run(this.run.arguments[0], this.run.arguments[1])
            }
            if (e.message.includes('filter type')) {
                this.run(this.run.arguments[0], this.run.arguments[1])
            }
            return void M.reply(e.message)
        })
        while (true) {
            try {
                M.reply(
                    buffer || notFound || `Could not fetch image. Please try again later`,
                    MessageType.image,
                    undefined,
                    undefined,
                    `🖌️ *Title: ${res.title}*\n*👨‍🎨 Author: ${res.author}*\n*🎏 Subreddit: ${res.subreddit}*\n🌐 *Post: ${res.postLink}*`,
                    // thumbnail && res.spoiler ? thumbnail : undefined
                    undefined
                )
                break
            } catch (e) {
                console.log(e)
            }
        }
        return void null
    }
}
