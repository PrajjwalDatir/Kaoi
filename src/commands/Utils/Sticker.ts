import { MessageType, Mimetype } from '@adiwajshing/baileys'
import { Sticker, Categories, StickerTypes } from 'wa-sticker-formatter'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'sticker',
            aliases: ['s'],
            description: 'Converts images/videos into stickers',
            category: 'utils',
            usage: `${client.config.prefix}sticker [(as caption | tag)[video | image]]`,
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage, parsedArgs: IParsedArgs): Promise<void> => {
        let buffer
        if (M.quoted?.message?.message?.imageMessage) buffer = await this.client.downloadMediaMessage(M.quoted.message)
        else if (M.WAMessage.message?.imageMessage) buffer = await this.client.downloadMediaMessage(M.WAMessage)
        else if (M.quoted?.message?.message?.videoMessage)
            // return void M.reply(`*Gif/Video to Sticker* feature is currently unavailable.\nYou can still use Image to Sticker though!!`)
            buffer = await this.client.downloadMediaMessage(M.quoted.message)
        else if (M.WAMessage.message?.videoMessage)
            // return void M.reply(`*Gif/Video to Sticker* feature is currently unavailable.\nYou can still use Image to Sticker though!!`)
            buffer = await this.client.downloadMediaMessage(M.WAMessage)
        if (!buffer) return void M.reply(`You didn't provide any Image/Video to convert`)
        // flags.forEach((flag) => (joined = joined.replace(flag, '')))
        parsedArgs.flags.forEach((flag) => (parsedArgs.joined = parsedArgs.joined.replace(flag, '')))
        const getOptions = () => {
        const pack = parsedArgs.joined.split('|')
        const categories = (() => {
            const categories = parsedArgs.flags.reduce((categories, flag) => {
                switch (flag) {
                    case '--angry':
                        categories.push('💢')
                        break
                    case '--love':
                        categories.push('💕')
                        break
                    case '--sad':
                        categories.push('😭')
                        break
                    case '--happy':
                        categories.push('😂')
                        break
                    case '--greet':
                        categories.push('👋')
                        break
                    case '--celebrate':
                        categories.push('🎊')
                        break
                }
                return categories
            }, new Array<Categories>())
            categories.length = 2
            if (!categories[0]) categories.push('❤', '🌹')
            return categories
        })()
        return {
            categories,
            pack: pack[1] || '👾 𝐇𝐚𝐧𝐝𝐜𝐫𝐚𝐟𝐭𝐞𝐝 𝐅𝐨𝐫 𝐘𝐨𝐮 ',
            author : pack[2] || '𝐖𝐡𝐚𝐭𝐬𝐀𝐩𝐩 𝐁𝐨𝐭𝐭𝐨 𝐊𝐚𝐨𝐢 👾',
            quality : parsedArgs.flags.includes('--low') 
            ? 10
            : parsedArgs.flags.includes('--high')
            ? 100
            : 50,
            type : StickerTypes[
                parsedArgs.flags.includes('--crop') || parsedArgs.flags.includes('--c')
                ? 'CROPPED'
                : parsedArgs.flags.includes('--stretch') || parsedArgs.flags.includes('--s')
                ? 'DEFAULT'
                : 'FULL'
            ]
        }
        }
        parsedArgs.flags.forEach((flag) => (parsedArgs.joined = parsedArgs.joined.replace(flag, '')))
        if (!buffer) return void M.reply(`You didn't provide any Image/Video to convert`)
        const sticker = await new Sticker(buffer, getOptions()).build().catch(() => null)
        if (!sticker) return void M.reply(`An Error Occurred While Converting`)
        await M.reply(sticker, MessageType.sticker, Mimetype.webp)
    }
}
