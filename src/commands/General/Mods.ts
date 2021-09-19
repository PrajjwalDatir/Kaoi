import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'mods',
            description: "Displays the Owner's contact info",
            category: 'general',
            usage: `${client.config.prefix}mods`,
            aliases: ['moderators', 'mod', 'owner']
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!this.client.config.mods || !this.client.config.mods[0]) return void M.reply('*[UNMODERATED]*')
        const filteredMap = this.client.config.mods.map((mod) => this.client.getContact(mod)).filter((user) => user)
        let text = ' *👾CREATED BY  ৫⃟🔥➤᭄᭄̊̊̊̊࿓࿔𝑱𝒂𝒚𝑱𝒂𝒚۝⃟̥̩̩̩̥̩̥͚̮🫂* \n\n'
        filteredMap.forEach(
            (user, index) =>
                (text += `#${index + 1}\n *ᴏᴡɴᴇʀ ➪:* ${
                    user.notify || user.vname || user.name || 'ᴊᴀʏᴊᴀʏ'
                }\n☎️ *Contact: https://wa.me/+${user?.jid?.split('@')[0]}*\n\n`)
        )
        text += `\n*ʙᴏᴛ ɴᴀᴍᴇ ➪* ❗ᴇᴛʜᴀɴ-ʙᴏᴛ\n*ᴘʀᴇғɪx ➪* !\n*ʙᴏᴛ ɴᴏ☎️ ➪* wa.me/+2349026336891\n\n*sᴛᴀᴛᴜs ➪* ᴏɴʟɪɴᴇ ɴᴏᴡ𒊹︎︎︎`
        return void M.reply(text)
    }
}
