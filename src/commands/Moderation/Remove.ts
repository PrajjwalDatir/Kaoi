import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            adminOnly: true,
            aliases: ['boom', 'kick'],
            command: 'remove',
            description: 'removes the mentioned users',
            category: 'moderation',
            usage: `${client.config.prefix}remove [@mention | tag]`,
            baseXp: 10
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        let text = '*Action*\n\n'
        if (!M.groupMetadata || !this.client.isBotAdmin(M.groupMetadata))
            return void M.reply(`❌ Failed to ${this.config.command} as I'm not an admin`)
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        if (!M.mentioned.length) return void M.reply(`Please tag the users you want to ${this.config.command}`)
        const ownerLike =
            M.groupMetadata?.owner ||
            (M.groupMetadata as { ownerPn?: string } | null | undefined)?.ownerPn ||
            ''
        for (const user of M.mentioned) {
            if (ownerLike.split('@')[0] === user.split('@')[0]) {
                text += `❌ Skipped *@${user.split('@')[0]}* as they're owner.\n`
                continue
            }
            if (this.client.isMe(user)) {
                text += `❌ Skipped *@${user.split('@')[0]}* as they're me.\n`
                continue
            }
            try {
                await this.client.groupRemove(M.from, [user])
                text += `🟥 Removed *@${user.split('@')[0]}*\n`
            } catch {
                text += `⚠ Could not remove *@${user.split('@')[0]}*\n`
            }
        }
        await M.reply(`${text}`, undefined, undefined, [...M.mentioned, M.sender.jid])
    }
}
