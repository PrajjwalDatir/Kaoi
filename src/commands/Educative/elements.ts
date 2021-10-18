import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import axios from 'axios'
export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'elements',
            description: 'get the info of the chemical element',
            aliases: ['element'],
            category: 'educative',
            usage: `${client.config.prefix}element [name]`
        })
    }
    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {



        if (!joined) return void M.reply('🔎 Provide a element symbol')
        const term = joined.trim()
        await axios.get(`https://neelpatel05.pythonanywhere.com/element/symbol?symbol=${term}`)
        .then((response) => {
                // console.log(response);
                const text = `Information of the element *${term}* is \n 🧪 *Name:* ${response.data.name} \n ⚛️ *Symbol:* ${response.data.symbol} \n 📍 *Atomic Number:* ${response.data.atomicNumber} \n 🧫 *Atomic Mass:* ${response.data.atomicMass} \n 🎯 *Atomic Radius:* ${response.data.atomicRadius} \n 🖇 *Bonding type:* ${response.data.bondingType} \n ⚗ *Density:* ${response.data.density} \n 🗃 *Group Block:* ${response.data.groupBlock} \n 🔎 *State:* ${response.data.standardState}`
                M.reply(text);
            })
            .catch(err => {
                M.reply(`🔍 Please provide a valid place name \n Error: ${err}`)
            }
            )
    };
}
