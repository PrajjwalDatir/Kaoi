import { MessageType } from '@adiwajshing/baileys'
import { join } from 'path'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IPackage, ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'void',
            description: 'Displays the info',
            category: 'misc',
            usage: `${client.config.prefix}void`,
            dm: true
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg: IPackage = require(join(__dirname, '..', '..', '..', 'package.json'))
        const image = this.client.assets.get('void')
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
