import { MessageType } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import redditFetcher, { IRedditResponse } from '../../lib/redditFetcher.js'
import request from '../../lib/request.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'subred',
            description: 'Fetches a random post from a subreddit',
            aliases: ['sr', 'reddit'],
            category: 'media',
            usage: `${client.config.prefix}subred [subreddit_name]`,
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void (await M.reply(`Please provide the subreddit you want to fetch`))
        const sub = joined.toLowerCase().trim()

        // Try up to 3 times — meme-api occasionally returns no media or
        // returns an unsupported file type; one or two retries usually clears it.
        let res: IRedditResponse | null = null
        for (let attempt = 0; attempt < 3; attempt++) {
            const response = await redditFetcher(sub)
            if ((response as { error: string }).error) {
                return void (await M.reply('Invalid Subreddit'))
            }
            res = response as IRedditResponse
            if (res.url) break
        }
        if (!res?.url) return void M.reply(`Couldn't fetch a post from r/${sub} right now.`)

        if (res.nsfw && !(await this.client.getGroupData(M.from)).nsfw)
            return void M.reply(
                `Cannot Display NSFW content before enabling. Use ${this.client.config.prefix}activate nsfw to activate nsfw`
            )

        const notFound = this.client.assets.get('404')
        let buffer: Buffer | undefined
        try {
            buffer = await request.buffer(res.url)
        } catch {
            buffer = undefined
        }

        try {
            await M.reply(
                buffer || notFound || `Could not fetch image. Please try again later`,
                MessageType.image,
                undefined,
                undefined,
                `🖌️ *Title: ${res.title}*\n*👨‍🎨 Author: ${res.author}*\n*🎏 Subreddit: ${res.subreddit}*\n🌐 *Post: ${res.postLink}*`
            )
        } catch (err) {
            await M.reply(`Could not send the post. Source URL: ${res.url}`)
        }
    }
}
