import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import axios from 'axios'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'calculator',
            aliases: ['calc'],
            description: 'Will solve the given question. ',
            category: 'educative',
            usage: `${client.config.prefix}calculator [question]`,
            baseXp: 50
        })
    }
    
    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void M.reply('*Expressions:* \n2B = Addition(+)\n- = Subtraction(-)\n/ = Divide(÷)\n* = Multiply(×)\n')
        const solve = joined.trim()
        await axios.get(`https://api.mathjs.org/v4/?expr=(${solve})`)
        .then((response) => {
                // console.log(response);
                const text = `💡 *Solution for ${solve} = ${response.data}*`
                M.reply(text);
            }).catch(err => {
                M.reply(`✖ Invalid Expression.\nUse ${this.client.config.prefix}calc to see the expressions.`)
            }
            )
    };
}
