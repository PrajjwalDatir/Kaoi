import { MessageType } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'invitelink',
            aliases: ['invite', 'linkgc'],
            description: 'Get the group invite link',
            category: 'general',
            usage: `${client.config.prefix}invite`,
            baseXp: 10
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        // check if Bot is the admin
        if (!M.groupMetadata) return void M.reply("This command can only be used in groups.")
        if (!this.client.isBotAdmin(M.groupMetadata))
            return void M.reply(`I'm not an admin of this group.`)
        if ((await this.client.getGroupData(M.from)).invitelink) {
            const code = await this.client.groupInviteCode(M.from).catch(() => {
                return void M.reply('Could not get the invite link')
            })
            await this.client.sendMessage(
                M.sender.jid,
                `*Invite link:* https://chat.whatsapp.com/${code}`,
                MessageType.text
            )
            return void M.reply('Sent you the Group Link in personal message')
        } else {
            return void M.reply(
                `Command not enabled by the admin.\nUse *${this.client.config.prefix}act invitelink* to enable it`
            )
        }
    }
}
