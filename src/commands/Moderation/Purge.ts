import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            adminOnly: true,
            command: 'purge',
            description: 'Removes all group members',
            category: 'moderation',
            usage: `${client.config.prefix}purge`,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!M.groupMetadata) return void M.reply('This command can only be used in groups.')
        // owner may be in LID form on modern groups; ownerPn is the PN equivalent.
        const owner = M.groupMetadata?.owner || ''
        const ownerPn = (M.groupMetadata as { ownerPn?: string } | null | undefined)?.ownerPn || ''
        const senderUser = M.sender.jid.split('@')[0]
        const ownerMatches =
            owner.split('@')[0] === senderUser ||
            ownerPn.split('@')[0] === senderUser ||
            this.client.sameUser(owner, M.sender.jid) ||
            this.client.sameUser(ownerPn, M.sender.jid)
        if (!ownerMatches) return void M.reply('Only the group owner can use this command')
        if (!M.groupMetadata || !this.client.isBotAdmin(M.groupMetadata))
            return void M.reply("I can't remove without being an admin")
        if (!this.purgeSet.has(M.groupMetadata?.id || '')) {
            this.addToPurge(M.groupMetadata?.id || '')
            return void M.reply(
                "Are you sure? This will remove everyone from the group chat. Use this command again if you'd like to proceed"
            )
        }
        for (const user of M.groupMetadata.participants) {
            if (!user.admin) {
                await this.client
                    .groupRemove(M.from, [user.id])
                    .catch(() => console.log(`Failed to remove ${user.id}`))
            }
        }
        for (const user of M.groupMetadata.admins || []) {
            if (user === M.sender.jid || this.client.isMe(user)) continue
            await this.client
                .groupRemove(M.from, [user])
                .catch(() => console.log(`Failed to remove admin ${user}`))
        }
        await M.reply('Done!').catch(() => console.log('Failed to send message'))
        await this.client.groupLeave(M.from).catch(() => undefined)
    }

    purgeSet = new Set<string>()

    addToPurge = async (id: string): Promise<void> => {
        this.purgeSet.add(id)
        setTimeout(() => this.purgeSet.delete(id), 60000)
    }
}
