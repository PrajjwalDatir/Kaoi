import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'chat',
            description: 'Chat with the bot. Mods: !chat start / !chat stop to enable in this chat.',
            aliases: ['bot'],
            category: 'fun',
            dm: true,
            usage: `${client.config.prefix}chat (text) | ${client.config.prefix}chat start | ${client.config.prefix}chat stop`,
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage, { args, joined }: IParsedArgs): Promise<void> => {
        const sub = (args[0] || '').toLowerCase()

        if (sub === 'start' || sub === 'stop') {
            if (!this.client.isMod(M.sender.jid))
                return void M.reply(`Only mods can ${sub} chat in this chat.`)
            const enable = sub === 'start'
            if (M.chat === 'group') {
                await this.client.setChatEnabled(M.from, enable, 'group')
            } else {
                await this.client.setChatEnabled(M.sender.jid, enable, 'user')
                if (!enable) this.client.chatAI.forget(M.from)
            }
            return void M.reply(
                enable
                    ? `Chat is now active here. Anyone can talk to me with ${this.client.config.prefix}chat <message>${
                          M.chat === 'dm' ? ' or just by sending a normal message.' : '.'
                      }`
                    : 'Chat disabled here.'
            )
        }

        const text = joined.trim()
        if (!text)
            return void M.reply(
                `Usage: ${this.client.config.prefix}chat <message>\n` +
                    `Mods: ${this.client.config.prefix}chat start | ${this.client.config.prefix}chat stop`
            )

        // Group context requires mods to have run !chat start; DMs do not (the
        // user is already DMing the bot — explicit !chat invocation is consent).
        if (M.chat === 'group') {
            const group = await this.client.getGroupData(M.from)
            if (!group.chatEnabled)
                return void M.reply(
                    `Chat isn't enabled here. A mod must run ${this.client.config.prefix}chat start first.`
                )
        }

        const quota = await this.client.consumeChatQuota(M.sender.jid)
        if (!quota.allowed)
            return void M.reply(
                `You've used your ${quota.limit} chat messages for today. A mod can extend with ${this.client.config.prefix}quota extend.`
            )

        const result = await this.client.chatAI.chat({
            jid: M.from,
            senderName: M.sender.username,
            text
        })
        if (!result.ok) return void M.reply(`Hmm, my brain glitched. (${result.error})`)
        return void M.reply(result.reply)
    }
}
