import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'
import axios from 'axios'
import request from '../../lib/request.js'
import { MessageType } from '../../lib/types.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'weather',
            aliases: ['wthr'],
            description: 'Gives you the weather of the given state or city. ',
            category: 'educative',
            usage: `${client.config.prefix}weather [place_name]`,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void M.reply('Please provide me the place name.')
        const place = joined.trim()
        await axios
            .get(
                `http://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
                    place
                )}&units=metric&appid=060a6bcfa19809c2cd4d97a212b19273&language=tr`,
                { timeout: 15_000 }
            )
            /* Note
  If you want to add some response, we'd recommend you to explore the json itself which provided link returns.
  This stability of the url and API KEY is not guaranteed.
  Regards: Team Kaoi
 */
            .then((response) => {
                // console.log(response);
                const text = `🔎 Weather for the place *${place}* found\n\n🌸 *Place:* ${response.data.name}\n*💮 Country:* ${response.data.sys.country}\n🌈 *Weather:* ${response.data.weather[0].description}\n🌡️ *Temperature:* ${response.data.main.temp}°C\n❄️ *Minimum Temperature:* ${response.data.main.temp_min}°C\n📛 *Maximum Temperature:* ${response.data.main.temp_max}°C\n💦 *Humidity:* ${response.data.main.humidity}%\n🎐 *Wind:* ${response.data.wind.speed} km/h\n`
                M.reply(text)
            })
            .catch((err) => {
                M.reply(`Sorry, couldn't find any state or place name related to *${place}*.`)
            })
    }
}
