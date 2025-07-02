import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'delete',
            description: 'Deletes the quoted Message',
            aliases: ['del'],
            category: 'general',
            usage: `${client.config.prefix}delete`,
            adminOnly: true,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!M?.quoted?.message) return void M.reply('Quote the message you want to delete')

        // Standard scenario: User quotes the bot's message and asks to delete it.
        if (M.quoted.sender === this.client.user.jid) {
            await this.client.deleteMessage(M.from, {
                id: (M.quoted.message as any).stanzaId,
                remoteJid: M.from,
                fromMe: true
            })
            return
        }

        // Scenario from TODO: User quotes their own message (M.quoted),
        // which is a reply to a message originally sent by the bot (M.quoted.quoted).
        // The user invoking the command (M.sender.jid) must be the author of M.quoted.
        if (
            M.quoted.quoted && // Ensure there's a "message replied to by the quoted message"
            M.quoted.quoted.sender === this.client.user.jid && // That message must be from the bot
            M.quoted.sender === M.sender.jid // The message quoted by the user must be their own message
        ) {
            await this.client.deleteMessage(M.from, {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                id: (M.quoted.quoted.message as any).stanzaId,
                remoteJid: M.from,
                fromMe: true
            })
            return
        }

        // If neither of the above conditions is met, the bot cannot delete the message.
        return void M.reply(`I can only delete messages sent by me, either directly quoted or if you quote your reply to my message.`)
    }
}
