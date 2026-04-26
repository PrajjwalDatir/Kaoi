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
        const owner = M.groupMetadata?.owner || ''
        if (owner.split('@')[0] !== M.sender.jid.split('@')[0])
            return void M.reply('Only the group owner can use this command')
        if (!M.groupMetadata?.admins?.includes(this.client.user.jid))
            return void M.reply("I can't remove without being an admin")
        if (!this.purgeSet.has(M.groupMetadata?.id || '')) {
            this.addToPurge(M.groupMetadata?.id || '')
            return void M.reply(
                "Are you sure? This will remove everyone from the group chat. Use this command again if you'd like to proceed"
            )
        }
        M.groupMetadata.participants.map(async (user) => {
            if (!user.admin)
                await this.client.groupRemove(M.from, [user.id]).catch(() => console.log('Failed to remove users'))
        })
        M.groupMetadata.admins?.map(async (user) => {
            if (user !== M.sender.jid && user !== this.client.user.jid)
                await this.client.groupRemove(M.from, [user]).catch(() => console.log('error removing admin'))
        })
        await M.reply('Done!').catch(() => console.log('Failed to send message'))
        this.client.groupLeave(M.from)
    }

    purgeSet = new Set<string>()

    addToPurge = async (id: string): Promise<void> => {
        this.purgeSet.add(id)
        setTimeout(() => this.purgeSet.delete(id), 60000)
    }
}
