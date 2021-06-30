import { MessageType } from '@adiwajshing/baileys'
import { join } from 'path'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'kaoi',
            description: 'Displays the info',
            category: 'misc',
            usage: `${client.config.prefix}kaoi`,
            dm: true
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const image = `https://avatars.githubusercontent.com/u/46681482?v=4`
        if (!image) return void null
        return void M.reply(
            image,
            MessageType.image,
            undefined,
            undefined,
            `🖤 *Kaoi* 🖤\n\n🍀 *Description: Maintained Fork of WhatsApp Botto Void\n\n🌐 *URL: https://github.com/PrajjwalDatir/Kaoi#readme\n\n📂 *Repository:* https://github.com/PrajjwalDatir/Kaoi`
        )
    }
}
