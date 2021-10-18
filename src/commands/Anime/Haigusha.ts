import waifulist from "public-waifulist"
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'
import request from '../../lib/request'
import { MessageType } from '@adiwajshing/baileys'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'haigusha',
            description: `Will send you random anime character with info.`,
            aliases: ['hg'],
            category: 'anime',
            usage: `${client.config.prefix}haigusha`,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        const waifuclient = new waifulist()
        const haigusha = await waifuclient.getRandom()
        const buffer = await request.buffer(haigusha.data.display_picture).catch((e) => {
            return void M.reply(e.message)
        })
        while (true) {
            try {
                M.reply(
                    buffer || '✖ An error occurred. Please try again later',
                    MessageType.image,
                    undefined,
                    undefined,
                    `💫 *Name:* ${haigusha.data.name}\n🎀 *Original Name:* ${haigusha.data.original_name}\n💚 *Description:* ${haigusha.data.description}\n💛 *Source:* ${haigusha.data.series.name}\n🌐 *URL:* ${haigusha.data.url}`,
                    undefined
                ).catch((e) => {
                    console.log(`This error occurs when an image is sent via M.reply()\n Child Catch Block : \n${e}`)
                    // console.log('Failed')
                    M.reply(`✖ An error occurred. Please try again later.`)
                })
                break
            } catch (e) {
                // console.log('Failed2')
                M.reply(`✖ An error occurred. Please try again later.`)
                console.log(`This error occurs when an image is sent via M.reply()\n Parent Catch Block : \n${e}`)
            }
        }
        return void null
    }
}
