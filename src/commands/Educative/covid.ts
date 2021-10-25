import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import axios from 'axios'
export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'covid',
            description: 'get the covid-19 info of the current place',
            aliases: ['COVID'],
            category: 'educative',
            usage: `${client.config.prefix}covid [name]`
        })
    }
    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        
        
        
        if (!joined) return void M.reply('🔎 Provide a place name')
        const term = joined.trim()
        await axios.get(`https://api.abirhasan.wtf/covid19/v1?country=${term}`)
        .then((response) => {
                // console.log(response);
                const text = `🦠 Covid Information of the place *${term}* is \n\n 🧪 *TotalTests:* ${response.data.TotalTests} \n 🎗 *ActiveCases:* ${response.data.ActiveCases} \n 🏥 *Confirmed:* ${response.data.Confirmed} \n 😳 *Critical:* ${response.data.Critical} \n ☘ *Recovered:* ${response.data.Recovered} \n 🧫 *NewCases:* ${response.data.NewCases} \n 💀 *NewDeaths:* ${response.data.NewDeaths} \n ✏ *TotalCases:* ${response.data.TotalCases} \n 🚩 *Country:* ${response.data.Country} `
                M.reply(text);
            })
            .catch(err => {
                M.reply(`🔍 Please provide a valid place name \n Error: ${err}`)
            }
            )
    };
}
