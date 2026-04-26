import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            adminOnly: true,
            command: 'demote',
            description: 'demotes the mentioned users',
            category: 'moderation',
            usage: `${client.config.prefix}demote [mention | @tag]`,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!M.groupMetadata) return void M.reply("This command can only be used in groups.")
        if (!this.client.isBotAdmin(M.groupMetadata))
            return void M.reply(`❌ Failed to ${this.config.command} as I'm not an admin`)
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        if (!M.mentioned.length) return void M.reply(`Please tag the users you want to ${this.config.command}`)
        for (const user of M.mentioned) {
            const usr = this.client.getContact(user)
            const username = usr.notify || usr.vname || usr.name || user.split('@')[0]
            if (!M.groupMetadata?.admins?.includes(user)) {
                await M.reply(`❌ Skipped *${username}* as they're not an admin`)
                continue
            }
            if (this.client.isMe(user)) {
                await M.reply(`❌ Skipped *${username}* — I can't demote myself`)
                continue
            }
            try {
                await this.client.groupDemoteAdmin(M.from, [user])
                await M.reply(`➰ Successfully Demoted *${username}*`)
            } catch (err) {
                await M.reply(`⚠ Could not demote *${username}*`)
            }
        }
    }
}
