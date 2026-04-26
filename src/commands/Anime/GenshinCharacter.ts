import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'
import axios from 'axios'
import request from '../../lib/request.js'
import { MessageType, Mimetype } from '../../lib/types.js'

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
        //if (!joined) return void (await M.reply(`You didnt provide any name of the charecter\n if you dont know use these charecter name \n\n albedo \n aloy \n amber \n ayaka \n barbara \n beidou \n bennett \n chongyun \n diluc \n diona \n eula \n fischl \n ganyu \n hu-tao \n jean \n kaeya \n kazuha \n keqing \n klee \n kokomi \n lisa \n mona \n ningguang \n noelle \n qiqi \n raiden \n razor \n rosaria \n sara \n sayu \n sucrose \n tartaglia \n traveler-anemo \n traveler-geo \n venti \n xiangling \n xiao \n xingqiu \n xinyan \n yanfei \n yoimiya \n zhongli \n\n *Example:* Type genshin-charecter amber or gchar amber`))
        const chara = await axios.get(`https://api.genshin.dev/characters`)
        if (!joined) return void (await M.reply(`📒 *The searchable characters are:* ${chara.data}`))
        const gchara = joined.trim()
        await axios
            .get(`https://api.genshin.dev/characters/${gchara}`)
            .then((response) => {
                const text = `💎 *Name:* ${response.data.name}\n💠 *Vision:* ${response.data.vision}\n📛 *Weapon:* ${response.data.weapon}\n⛩ *Nation:* ${response.data.nation}\n📛 *Affiliation:* ${response.data.affiliation}\n❄ *Constellation:* ${response.data.constellation}\n🎗 *Rarity:* ${response.data.rarity} stars\n🎁 *Birthday:* ${response.data.birthday}\n💚 *Description:* ${response.data.description}\n`
                M.reply(text)
            })
            .catch((err) => {
                M.reply(`Sorry, couldn't find character *${gchara}*\n🧧 *Use:* ${this.client.config.prefix}gchar to see the full list of searchable characters.\n\n📝 *Note:* Nicknames does not work here.`)
            })
    }
}
