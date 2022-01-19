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
            command: 'ip',
            description: `Gives you info about IP Address`,
            aliases: ['ipa', 'ip', 'ipaddress'],
            category: 'educative',
            usage: `${client.config.prefix}ip [name]`,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void (await M.reply(`Please provide the IP Address`))
        const pypi = joined.trim()
        await axios
            .get(`http://ip-api.com/json/${pypi}`)
            if (response.data.status === "fail") return void M.reply("Invalid id")
                const text = `Status : ${response.data.status} \n IP : ${response.data.query} \n ISP : ${response.data.isp} \n Organisation : ${response.data.org} \n Country : ${response.data.country} \n Region : ${response.data.regionName} \n City : ${response.data.country} `
                M.reply(text)
            })
            .catch((err) => {
                M.reply(`Sorry, error.`)
            })
    }
}
