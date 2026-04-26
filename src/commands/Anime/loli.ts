import { MessageType } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import request from '../../lib/request.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'loli',
            description: 'Will send you random loli image',
            category: 'anime',
            usage: `${client.config.prefix}loli`
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        const onefive = Math.floor(Math.random() * 145) + 1

        return void M.reply(
            await request.buffer(`https://media.publit.io/file/Twintails/${onefive}.jpg`),

            MessageType.image,
            undefined,
            undefined,

            `*Niko Niko Ni*`
        )
    }
}
