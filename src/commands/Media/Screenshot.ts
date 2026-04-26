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
            command: 'screenshot',
            aliases: ['ss', 'ssweb'],
            description: 'Gives you the screenshot of the given url. ',
            category: 'media',
            usage: `${client.config.prefix}screenshot [url]`,
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void (await M.reply(`Please provide the url`))
        const url = joined.trim()
        return void M.reply(
            await request.buffer(
                `https://shot.screenshotapi.net/screenshot?&url=${url}&full_page=true&fresh=true&output=image&file_type=png&wait_for_event=load`
            ),
            MessageType.image,
            undefined,
            undefined,
            `🌟 Here you go.\n`,
            undefined
        ).catch((reason: any) => M.reply(`✖ An error occurred. Please try again later. ${reason}`))
    }
}
