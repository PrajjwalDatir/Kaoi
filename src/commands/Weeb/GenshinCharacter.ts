import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import genshindb from 'genshin-db'
import request from '../../lib/request'
import { MessageType } from '@adiwajshing/baileys'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'genshincharacter',
            description: `Gives you the data of the given genshin character.`,
            aliases: ['gchar', 'genshinchara'],
            category: 'weeb',
            usage: `${client.config.prefix}genshincharacter [name]`,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void (await M.reply(`Please provide the character name.`))
        const genshin = joined.trim()
        const chara = await genshindb.characters(genshin)
        if (chara === undefined) {
            return void M.reply('No such character, Baka!')
        }
        let text = ''
        text += `💎 *Name: ${chara.name}*\n`
        text += `💠 *Elemnent: ${chara.element}*\n`
        text += `📛 *Weapon: ${chara.weapontype}*\n`
        text += `🎗 *Speciality: ${chara.substat}*\n`
        text += `🌟 *Rarity: ${chara.rarity}*\n`
        text += `🌸 *Gender: ${chara.gender}*\n`
        text += `❄ *Constellation: ${chara.constellation}*\n`
        text += `⛩ *Region: ${chara.region}*\n`
        text += `💮 *Affiliation: ${chara.affiliation}*\n`
        text += `🎁 *Birthday: ${chara.birthday}*\n\n`
        text += `💛 *Description: ${chara.description}*\n\n`
        text += `🌐 *URL: ${chara.url.fandom}*`
        const buffer = await request.buffer(chara.images.cover1).catch((e) => {
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
