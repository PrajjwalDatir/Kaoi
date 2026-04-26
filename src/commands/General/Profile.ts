import { MessageType } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import request from '../../lib/request.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

const FALLBACK_PFP =
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Kawaii_robot_power_clipart.svg/640px-Kawaii_robot_power_clipart.svg.png'

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
        let pfp: Buffer | undefined
        try {
            pfp = await this.client.getProfilePicture(user)
        } catch {
            M.reply(`Profile Picture not Accessible of ${username}`)
        }
        const data = await this.client.getUser(user)
        const buffer = pfp || (await request.buffer(FALLBACK_PFP))
        const status = (await this.client.getStatus(user)).status || 'None'
        await M.reply(
            buffer,
            MessageType.image,
            undefined,
            undefined,
            `🎋 *Username: ${username}*\n\n🎫 *About: ${status}*\n\n🌟 *XP: ${data.Xp || 0}*\n\n👑 *Admin: ${
                M.groupMetadata?.admins?.includes(user) || false
            }*\n\n❌ *Ban ${data.ban || false}*`
        )
    }
}
