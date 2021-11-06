import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import AnimeQuotes from 'animequotes'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'animequote',
            description: 'Will give you random anime quote for the given character.',
            aliases: ['aq'],
            category: 'weeb',
            usage: `${client.config.prefix}animequote [character_name]`,
            baseXp: 10
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        const random = await AnimeQuotes.randomQuote()
        let randomText = ''
        randomText += `*✏ Quote: ${random.quote}*\n`
        randomText += `*🎗 Said by: ${random.name}*\n\n`
        randomText += `*📛 Source: ${random.anime}*`
        if (!joined) return void (await M.reply(`${randomText}`))
        const chara = joined.trim()
        const byChara = await AnimeQuotes.getRandomQuoteByCharacter(chara)
        let charaText = ''
        charaText += `*✏ Quote: ${byChara.quote}*\n`
        charaText += `*🎗 Said by: ${byChara.name}*\n\n`
        charaText += `*📛 Source: ${byChara.anime}*`
        await M.reply(charaText)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .catch((reason: any) => M.reply(`${reason}`))
    }
}
