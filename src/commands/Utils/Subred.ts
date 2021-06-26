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
            dm: true,
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
        const thumbnail = this.client.assets.get('spoiler')
        return void M.reply(
            await request.buffer(res.url),
            MessageType.image,
            undefined,
            undefined,
            `🖌️ *Title: ${res.title}*\n👨‍🎨 *Author: ${res.author}*\n🎏 *Subreddit: ${res.subreddit}*\n🌐 *Post: ${res.postLink}*`,
            thumbnail && res.spoiler ? thumbnail : undefined
        )
    }
}
