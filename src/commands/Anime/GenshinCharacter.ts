import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import axios from 'axios'
import request from '../../lib/request'
import { MessageType, Mimetype } from '@adiwajshing/baileys'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'genshincharacter',
            description: `Gives you the data of the given genshin character.`,
            aliases: ['gchar', 'genshin'],
            category: 'anime',
            usage: `${client.config.prefix}gchar [name]`,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void (await M.reply(`Please provide the character name that you wanna search.`))
        const gchara = joined.trim()
        await axios.get(`https://api.genshin.dev/characters/${gchara}`)
        .then((response) => {
                const text = `💎 *Name:* ${response.data.name}\n💠 *Vision:* ${response.data.vision}\n📛 *Weapon:* ${response.data.weapon}\n⛩ *Nation:* ${response.data.nation}\n📛 *Affiliation:* ${response.data.affiliation}\n❄ *Constellation:* ${response.data.constellation}\n🎗 *Rarity:* ${response.data.rarity} stars\n🎁 *Birthday:* ${response.data.birthday}\n💚 *Description:* ${response.data.description}\n`
                M.reply(text);
            }).catch(err => {
                M.reply(`Sorry, couldn't find character *${gchara}*\n📝 *Note:* Nicknames does not work here.`)
            }
            )
    };
}
