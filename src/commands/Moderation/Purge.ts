import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            adminOnly: true,
            command: 'purge',
            description: 'Removes all group members',
            category: 'moderation',
            usage: `${client.config.prefix}purge`
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (
            M.groupMetadata?.owner !== M.sender.jid &&
            M.groupMetadata?.owner !== M.sender.jid.replace('s.whatsapp.net', 'c.us')
        )
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
            if (!user.isAdmin) await this.client.groupRemove(M.from, [user.jid]).catch(() => console.log('Failed to remove users'))
        })
        // now remove all admins except yourself and the owner
        M.groupMetadata.admins.map(async (user) => {
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
