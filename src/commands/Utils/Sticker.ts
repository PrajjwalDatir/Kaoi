import { MessageType, Mimetype } from '@adiwajshing/baileys'
import { Sticker } from 'wa-sticker-formatter'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'sticker',
            description: 'Converts images/videos into stickers',
            category: 'utils',
            usage: `${client.config.prefix}sticker [(as caption | tag)[video | image]]`,
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage, parsedArgs: IParsedArgs): Promise<void> => {
        let buffer
        if (M.quoted?.message?.message?.imageMessage || M.quoted?.message?.message?.videoMessage)
            buffer = await this.client.downloadMediaMessage(M.quoted.message)
        if (M.WAMessage.message?.imageMessage || M.WAMessage.message?.videoMessage)
            buffer = await this.client.downloadMediaMessage(M.WAMessage)
        if (!buffer) return void M.reply(this.client.responses.get('invalid-sticker-param', M.response))
        flags.forEach((flag) => (joined = joined.replace(flag, '')))
        const pack = joined.split('|')
        const categories = (() => {
            const categories = flags.reduce((categories, flag) => {
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
        const sticker = new Sticker(buffer, {
            categories,
            pack: pack[1] || '👾 𝐇𝐚𝐧𝐝𝐜𝐫𝐚𝐟𝐭𝐞𝐝 𝐅𝐨𝐫 𝐘𝐨𝐮 ',
            author: pack[2] || '𝐖𝐡𝐚𝐭𝐬𝐀𝐩𝐩 𝐁𝐨𝐭𝐭𝐨 𝐊𝐚𝐨𝐢 👾',
            type: flags.includes('--crop') || flags.includes('--c') ? 'crop' : flags.includes('--stretch') || flags.includes('--s') ? 'default' : 'full'
        })
        await M.reply(await sticker.build(), MessageType.sticker, Mimetype.webp)
    }
}
