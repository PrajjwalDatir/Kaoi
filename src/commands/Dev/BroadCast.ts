import { MessageType } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'

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
        const chats = Array.from(this.client.chats).filter((jid) => jid.endsWith('@g.us'))
        const text = `*「 Kaoi Broadcast 」* \n *📢 announcement :* \n${term} By *${M.sender.username}*`
        for (const jid of chats) {
            await this.client
                .sendMessage(jid, text, MessageType.text, {
                    contextInfo: { mentionedJid: M.groupMetadata?.participants.map((u) => u.id) || [] }
                })
                .catch(() => undefined)
        }
    }
}
