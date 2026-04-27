import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'
import { computeRizz, normalizeJid } from '../../lib/Ship/index.js'
import { MessageType } from '../../lib/types.js'

const tagFor = (jid: string): string => `@${jid.split('@')[0]}`

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'shiprank',
            description: 'Show rizz breakdown for a user',
            aliases: ['rizz'],
            category: 'fun',
            usage: `${client.config.prefix}shiprank [tag/quote user]`,
            baseXp: 10
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        // Normalize: M.mentioned[] is raw and can carry a :NN device suffix,
        // which would create a duplicate rizz doc keyed on the suffixed form.
        const target =
            normalizeJid(M.quoted?.sender || M.mentioned[0] || M.sender.jid) ||
            M.sender.jid
        const b = await computeRizz(this.client, target)
        const lines = [
            `✨ *${tagFor(target)}'s Rizz Sheet* ✨`,
            `─────────────────────`,
            `*Score:* ${b.score}%`,
            `─────────────────────`,
            `Base rizz: ${b.base}`,
            `Outsiders: ${b.outsiderCount}  → +${b.outsiderTerm}`,
            `Bonds in: ${b.bondCount}  → +${b.bondTerm}`,
            ``,
            `_Outsiders rises every time a new person ships you. Bonds rise from !react actions in your relationships._`
        ]
        await M.reply(lines.join('\n'), MessageType.text, undefined, [target])
    }
}
