import { MessageType } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'broadcast',
            description: 'Sends msg to all group chats',
            aliases: ['BC', 'announcement', 'bc'],
            category: 'dev',
            usage: `${client.config.prefix}broadcast`,
            modsOnly: true,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        const term = joined.trim()
        if (!term) return void M.reply('Provide a broadcast message.')
        const chats = Array.from(this.client.chats).filter((jid) => jid.endsWith('@g.us'))
        if (!chats.length)
            return void M.reply(
                'No groups observed yet — bot needs to receive a message in each group first.'
            )
        const text = `*「 Kaoi Broadcast 」*\n*📢 announcement:*\n${term}\n\n_— ${M.sender.username}_`

        let sent = 0
        let failed = 0
        for (const jid of chats) {
            try {
                // No mentionedJid — mentions from the source group don't apply
                // to other groups and would just spam unrelated members.
                await this.client.sendMessage(jid, text, MessageType.text)
                sent += 1
            } catch {
                failed += 1
            }
            // Throttle to avoid WhatsApp's spam detection.
            await sleep(1500)
        }
        await M.reply(`📡 Broadcast complete. Sent: ${sent}, Failed: ${failed}.`)
    }
}
