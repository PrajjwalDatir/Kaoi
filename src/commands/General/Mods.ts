import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

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
        const filteredMap = this.client.config.mods.map((mod) => this.client.getContact(mod)).filter((user) => user)
        let text = '🍥 *Moderators* 🍥\n\n'
        filteredMap.forEach(
            (user, index) =>
                (text += `#${index + 1}\n🎫 *Username: ${
                    user.notify || user.vname || user.name || 'null'
                }*\n🍀 *Contact: https://wa.me/+${user?.jid?.split('@')[0]}*\n\n`)
        )
        text += `\nTo deploy your own Bot or To support Kaoi👾\nVisit : https://github.com/PrajjwalDatir/Kaoi `
        return void M.reply(text)
    }
}
