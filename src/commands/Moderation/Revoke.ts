import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            adminOnly: true,
            command: 'revoke',
            description: 'Revokes the group link.',
            category: 'moderation',
            usage: `${client.config.prefix}revoke`,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!M.groupMetadata) return void M.reply("This command can only be used in groups.")
        if (!this.client.isBotAdmin(M.groupMetadata))
            return void M.reply("I can't revoke the group link without being an admin")
        await this.client.groupRevokeInvite(M.from).catch(() => {
            return void M.reply('Failed to revoke the group link')
        })
        return void M.reply('Group link revoked')
    }
}
