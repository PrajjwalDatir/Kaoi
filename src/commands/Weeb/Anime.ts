import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import malScraper from 'mal-scraper'
import request from '../../lib/request'
import { MessageType } from '@adiwajshing/baileys'
// import { MessageType, Mimetype } from '@adiwajshing/baileys'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'anime',
            description: `Gives you the data of the given anime from MyAnimeList.`,
            aliases: ['ani', 'a'],
            category: 'weeb',
            usage: `${client.config.prefix}anime [title]`,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void (await M.reply(`Please provide the anime title.`))
        const ani = joined.trim()
        const anime = await malScraper.getInfoFromName(ani).catch(() => null)
        if (!anime) return void (await M.reply(`Couldn't find any matching term.`))
        let text = ''
        text += `🎀 *Title: ${anime.title}*\n`
        text += `🎋 *Type: ${anime.type}*\n`
        text += `🎐 *Premiered on: ${anime.premiered}*\n`
        text += `💠 *Total Episodes: ${anime.episodes}*\n`
        text += `📈 *Status: ${anime.status}*\n`
        text += `💮 *Genres: ${anime.genres}`
        text += `📍 *Studio: ${anime.studios}*\n`
        text += `🌟 *Score: ${anime.score}*\n`
        text += `💎 *Rating: ${anime.rating}*\n`
        text += `🏅 *Rank: ${anime.ranked}*\n`
        text += `💫 *Popularity: ${anime.popularity}*\n\n`
        text += `♦️ *Trailer: ${anime.trailer}*\n\n`
        text += `🌐 *URL: ${anime.url}*\n\n`
        text += `❄ *Description:* ${anime.synopsis}`
        const buffer = await request.buffer(anime.picture).catch((e) => {
            return void M.reply(e.message)
        })
        while (true) {
            try {
                M.reply(
                    buffer || '✖ An error occurred. Please try again later.',
                    MessageType.image,
                    undefined,
                    undefined,
                    `${text}`,
                    undefined
                ).catch((e) => {
                    console.log(`This error occurs when an image is sent via M.reply()\n Child Catch Block : \n${e}`)
                    // console.log('Failed')
                    M.reply(`✖ An error occurred. Please try again later.`)
                })
                break
            } catch (e) {
                // console.log('Failed2')
                M.reply(`✖ An error occurred. Please try again later.`)
                console.log(`This error occurs when an image is sent via M.reply()\n Parent Catch Block : \n${e}`)
            }
        }
        return void null
    }
}
