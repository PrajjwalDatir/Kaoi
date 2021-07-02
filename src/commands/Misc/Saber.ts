import { MessageType } from '@adiwajshing/baileys'
import { join } from 'path'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'saber',
            description: 'Displays the info',
            category: 'misc',
            usage: `${client.config.prefix}kaoi`,
            dm: true
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        return void M.reply(`🐦 *Saber* 🐦\n\n🍀 *Description:* Maintained Fork of WhatsApp Botto Void\n\n🌐 *URL:* https://github.com/AB1RZ9/Saber-Pendragon#readme\n\n📂 *Repository:* https://github.com/AB1RZ9/Saber-Pendragon`
        ).catch((reason: any) =>
            M.reply(`an error occupered, Reason: ${reason}`))
    }
}
