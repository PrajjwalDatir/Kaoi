import { MessageType, Mimetype } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'react',
            description: `Let's React`,
            aliases: [
                'r',
                'cry',
                'kiss',
                'bully',
                'hug',
                'lick',
                'cuddle',
                'pat',
                'smug',
                'highfive',
                'bonk',
                'yeet',
                'blush',
                'wave',
                'smile',
                'handhold',
                'nom',
                'bite',
                'glomp',
                'kill',
                'slap',
                'cringe',
                'kick',
                'wink',
                'happy',
                'poke',
                'dance'
            ],
            category: 'fun',
            usage: `${client.config.prefix}(reaction) [tag/quote users]\nExample: ${client.config.prefix}pat`,
            baseXp: 10
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        // make key value pairs of reactions like this: { 'bully': 'bullied', 'cuddle': 'cuddled', ... }
        // Access raw text of message
        const action = M.content?.split(' ')[0].slice(1).toLowerCase() || ''
        let flag = true
        if (!(action === 'r' || action === 'react')) {
            flag = false
        }
        const Reactions = {
            cry: ['Cried with', 'is Crying by'],
            kiss: ['Kissed'],
            bully: ['Bullied'],
            hug: ['Hugged'],
            lick: ['Licked'],
            cuddle: ['Cuddled with'],
            pat: ['Patted'],
            smug: ['Smugged at', 'is Smugging by'],
            highfive: ['High-fived'],
            bonk: ['Bonked'],
            yeet: ['Yeeted'],
            blush: ['Blushed at', 'is Blushing by'],
            wave: ['Waved at'],
            smile: ['Smiled at', 'is Smiling by'],
            handhold: ['is Holding Hands with'],
            nom: ['is Eating with', 'is Eating by'],
            bite: ['Bit'],
            glomp: ['Glomped'],
            kill: ['Killed'],
            slap: ['Slapped'],
            cringe: ['Cringed at'],
            kick: ['Kicked'],
            wink: ['Winked at'],
            happy: ['is Happy with', 'is Happy by'],
            poke: ['Poked'],
            dance: ['is Dancing with', 'is Dancing by']
        } as unknown as { [key: string]: string[] }
        // take the first argument and make it lowercase
        const term = flag ? joined.split(' ')[0].toLowerCase() : action
        let text = ''
        // map over reactions and add index + reaction to text
        Object.keys(Reactions).map((reaction) => {
            text += `📍${reaction.charAt(0).toUpperCase() + reaction.slice(1)}\n`
            // if index is multiple of 3, add a new line, else give 10 - length of the reaction spaces
            // index % 3 === 2 ? (text += '\n') : (text += ' '.repeat(10 - reaction.length))
        })
        text += `🎀 *Usage:* ${this.client.config.prefix}(reaction) [tag/quote users]\nExample: ${this.client.config.prefix}pat`
        if (flag) {
            if (!term) return void M.reply(`🪧 *OPTIONS:*\n${text}`)
            if (!Object.keys(Reactions).includes(term))
                return void M.reply(
                    `🧧 No Reaction Found 🧧\nUse ${this.client.config.prefix}r to see all available reactions`
                )
        }
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        if (!M.mentioned.length) M.mentioned.push(M.sender.jid)
        // remove duplicate mentions
        M.mentioned = [...new Set(M.mentioned)]
        let grammar: string
        M.mentioned[0] === M.sender.jid
            ? (grammar = Reactions[`${term}`].pop() || Reactions[`${term}`][0])
            : (grammar = Reactions[`${term}`][0])
        M.reply(
            await this.client.util.GIFBufferToVideoBuffer(
                await this.client.getBuffer(
                    (
                        await this.client.fetch<{ url: string }>(`https://api.waifu.pics/sfw/${term}`)
                    ).url
                )
            ),
            MessageType.video,
            Mimetype.gif,
            [M.sender.jid, ...M.mentioned],
            `*@${M.sender.jid.split('@')[0]} ${grammar} ${M.mentioned
                .map((user) => (user === M.sender.jid ? 'Themselves' : `@${user.split('@')[0]}`))
                .join(', ')}*`
        )
    }
}
