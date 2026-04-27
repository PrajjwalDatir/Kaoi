import { MessageType } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'profile',
            description: 'Displays user-profile 🌟',
            category: 'general',
            usage: `${client.config.prefix}profile (@tag)`,
            aliases: ['p'],
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        const user = M.mentioned[0] ? M.mentioned[0] : M.sender.jid
        let username = user === M.sender.jid ? M.sender.username : ''
        if (!username) {
            const contact = this.client.getContact(user)
            username = contact.notify || contact.vname || contact.name || user.split('@')[0]
        }
        const pfp = await this.client.getProfilePicture(user)
        const data = await this.client.getUser(user)
        const status = (await this.client.getStatus(user)).status || 'None'
        const profile = `🎋 *Username: ${username}*\n\n🎫 *About: ${status}*\n\n🌟 *XP: ${
            data.Xp || 0
        }*\n\n👑 *Admin: ${
            M.groupMetadata?.admins?.includes(user) || false
        }*\n\n❌ *Ban ${data.ban || false}*`
        if (pfp) await M.reply(pfp, MessageType.image, undefined, undefined, profile)
        else await M.reply(`📷 _No profile picture available for ${username}_\n\n${profile}`)
    }
}
