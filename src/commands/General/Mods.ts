import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'mods',
            description: "Displays the Moderators' contact info",
            category: 'general',
            usage: `${client.config.prefix}mods`,
            aliases: ['moderators', 'mod', 'owner'],
            baseXp: 40
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!this.client.config.mods || !this.client.config.mods[0]) return void M.reply('*No Mods Set*')
        const entries = this.client.config.mods.map((jid) => ({ jid, info: this.client.getContact(jid) }))
        let text = '🍥 *Moderators* 🍥\n\n'
        entries.forEach(({ jid, info }, index) => {
            text += `#${index + 1}\n🎫 *Username: ${
                info.notify || info.vname || info.name || 'null'
            }*\n🍀 *Contact: https://wa.me/+${jid.split('@')[0]}*\n\n`
        })
        text += `\nTo deploy your own Bot or To support Kaoi👾\nVisit : https://github.com/PrajjwalDatir/Kaoi `
        return void M.reply(text)
    }
}
