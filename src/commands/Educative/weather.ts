import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import axios from 'axios'
export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'weather',
            description: 'Searches on the web',
            aliases: ['wthr'],
            category: 'utils',
            usage: `${client.config.prefix}weather [name]`
        })
    }
    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {



        if (!joined) return void M.reply('🔎 Provide a place name')
        const term = joined.trim()
        await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${term}&units=metric&appid=d6bab2c6c404f2efd371b0f9d3389cdc&language=tr`)
        .then((response) => {
                // console.log(response);
                const text = `Weather of the place *${term}* is \n 🌡 *Temperature:* ${response.data.main.temp}℃ \n 📉 *Min Temp:* ${response.data.main.temp_min}℃ \n 📈 *Max Temp:* ${response.data.main.temp_max}℃ \n ⬇ *Pressure:* ${response.data.main.pressure} atm \n ☘ *Humidity:* ${response.data.main.humidity}% \n 💨 *Wind Speed:* ${response.data.wind.speed} km/h \n 👀 *Visibility:* ${response.data.visibility} metres \n *Country:* ${response.data.sys.country} `
                M.reply(text);
            })
            .catch(err => {
                M.reply(`🔍 Please provide a valid place name \n Error: ${err}`)
            }
            )
    };
}
