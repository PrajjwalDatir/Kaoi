import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import axios from 'axios'


 export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'genshin-charecter',
            description: 'Well....',
            aliases: ['genshin-char', 'gchar'],
            category: 'utils',
            usage: `${client.config.prefix}gchar`
        })
    }

     run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void M.reply('You didnt provide any name of the charecter\n if you dont know use these charecter name \n\n albedo \n aloy \n amber \n ayaka \n barbara \n beidou \n bennett \n chongyun \n diluc \n diona \n eula \n fischl \n ganyu \n hu-tao \n jean \n kaeya \n kazuha \n keqing \n klee \n kokomi \n lisa \n mona \n ningguang \n noelle \n qiqi \n raiden \n razor \n rosaria \n sara \n sayu \n sucrose \n tartaglia \n traveler-anemo \n traveler-geo \n venti \n xiangling \n xiao \n xingqiu \n xinyan \n yanfei \n yoimiya \n zhongli \n\n *Example:* Type genshin-charecter amber or gchar amber')
        const term = joined.trim()
        await axios.get(`https://api.genshin.dev/characters/${term}`)
        .then((response) => {
                // console.log(response);
                const text = `💎 *Name: ${response.data.name}*\n💠 *Vision: ${response.data.vision}*\n📛 *Weapon: ${response.data.weapon}*\n⛩ *Nation: ${response.data.nation}*\n📛 *Affiliation: ${response.data.affiliation}*\n❄ *Constellation: ${response.data.constellation}*\n🎗 *Rarity: ${response.data.rarity}*\n🎁 *Birthday: ${response.data.birthday}*\n💚 *Description: ${response.data.description}*`
                M.reply(text);
            }).catch(err => {
                M.reply(`🔍 Error: ${err}`)
            }
            )
    };
}
