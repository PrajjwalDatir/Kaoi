import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'
import axios from 'axios'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'advice',
            description: 'Gives you random advice.\nDisclaimer: We do not hold responsibility of consequences of your actions based on the advice.',
            category: 'fun',
            usage: `${client.config.prefix}advice`,
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        await axios
            .get(`https://api.adviceslip.com/advice`, { timeout: 15_000 })
            .then((response) => {
                // console.log(response);
                const text = `*Advice for you🔖:* ${response.data.slip.advice}`
                M.reply(text)
            })
            .catch((err) => {
                M.reply(`🔍 Error: ${err}`)
            })
    }
}
