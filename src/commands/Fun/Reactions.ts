import { MessageType, Mimetype } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'
import request, { firstOk } from '../../lib/request.js'

/** Map our reaction names to upstream provider endpoints. waifu.pics is the
 * primary source; nekos.best is a fallback (and the ONLY source for some
 * reactions waifu.pics doesn't have). */
const REACTION_SOURCES: Record<string, { waifu?: string; nekos?: string }> = {
    cry: { waifu: 'cry', nekos: 'cry' },
    kiss: { waifu: 'kiss', nekos: 'kiss' },
    bully: { waifu: 'bully' },
    hug: { waifu: 'hug', nekos: 'hug' },
    lick: { waifu: 'lick' },
    cuddle: { waifu: 'cuddle', nekos: 'cuddle' },
    pat: { waifu: 'pat', nekos: 'pat' },
    smug: { waifu: 'smug', nekos: 'smug' },
    highfive: { waifu: 'highfive', nekos: 'highfive' },
    bonk: { waifu: 'bonk', nekos: 'bonk' },
    yeet: { waifu: 'yeet', nekos: 'yeet' },
    blush: { waifu: 'blush', nekos: 'blush' },
    wave: { waifu: 'wave', nekos: 'wave' },
    smile: { waifu: 'smile', nekos: 'smile' },
    handhold: { waifu: 'handhold', nekos: 'handhold' },
    nom: { waifu: 'nom', nekos: 'nom' },
    bite: { waifu: 'bite', nekos: 'bite' },
    glomp: { waifu: 'glomp' },
    kill: { waifu: 'kill' },
    slap: { waifu: 'slap', nekos: 'slap' },
    cringe: { waifu: 'cringe' },
    kick: { waifu: 'kick', nekos: 'kick' },
    wink: { waifu: 'wink', nekos: 'wink' },
    happy: { waifu: 'happy', nekos: 'happy' },
    poke: { waifu: 'poke', nekos: 'poke' },
    dance: { waifu: 'dance', nekos: 'dance' }
}

const Reactions: { [key: string]: string[] } = {
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
}

const fetchReactionGif = async (term: string): Promise<Buffer | null> => {
    const sources = REACTION_SOURCES[term]
    if (!sources) return null
    const fns: Array<() => Promise<string>> = []
    if (sources.waifu)
        fns.push(() =>
            request
                .json<{ url: string }>(`https://api.waifu.pics/sfw/${sources.waifu}`)
                .then((r) => r.url)
        )
    if (sources.nekos)
        fns.push(() =>
            request
                .json<{ results: { url: string }[] }>(`https://nekos.best/api/v2/${sources.nekos}`)
                .then((r) => r.results?.[0]?.url)
        )
    const result = await firstOk<string>(fns)
    if (!result.ok || !result.value) return null
    try {
        return await request.buffer(result.value)
    } catch {
        return null
    }
}

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'react',
            description: `Let's React`,
            // `kick` is reserved for the moderation Remove command (more
            // useful as a group-management alias). The kick reaction is still
            // reachable via `!react kick`.
            aliases: Object.keys(REACTION_SOURCES)
                .filter((k) => k !== 'kick')
                .concat(['r']),
            category: 'fun',
            usage: `${client.config.prefix}(reaction) [tag/quote users]\nExample: ${client.config.prefix}pat`,
            baseXp: 10
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        // Robust action extraction — handles `!  pat` (multiple spaces),
        // empty content, and missing prefix uniformly.
        const firstWord = (M.content || '').trim().split(/\s+/)[0] || ''
        const action = firstWord.startsWith(this.client.config.prefix)
            ? firstWord.slice(this.client.config.prefix.length).toLowerCase()
            : firstWord.toLowerCase()
        const isMenu = action === 'r' || action === 'react'
        const term = isMenu ? (joined.trim().split(/\s+/)[0] || '').toLowerCase() : action

        if (isMenu && !term) {
            const list = Object.keys(Reactions)
                .map((r) => `📍${r.charAt(0).toUpperCase() + r.slice(1)}`)
                .join('\n')
            return void M.reply(
                `🪧 *OPTIONS:*\n${list}\n🎀 *Usage:* ${this.client.config.prefix}(reaction) [tag/quote users]\nExample: ${this.client.config.prefix}pat`
            )
        }
        if (!Reactions[term]) {
            return void M.reply(
                `🧧 No Reaction Found 🧧\nUse ${this.client.config.prefix}r to see all available reactions`
            )
        }

        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        if (!M.mentioned.length) M.mentioned.push(M.sender.jid)
        M.mentioned = [...new Set(M.mentioned)]

        // Reactions[term] is a shared module-level object, so we read by index
        // instead of mutating with .pop(). [0] is the active phrase ("Patted"),
        // [1] is the passive/self phrase ("is Patting by") when present.
        const phrases = Reactions[term]
        const grammar =
            M.mentioned[0] === M.sender.jid ? phrases[1] || phrases[0] : phrases[0]

        const gifBuffer = await fetchReactionGif(term)
        if (!gifBuffer) {
            return void M.reply(
                `Couldn't fetch a *${term}* GIF right now — the upstream provider may be down. Try again in a moment.`
            )
        }
        let videoBuffer: Buffer
        try {
            videoBuffer = await this.client.util.GIFBufferToVideoBuffer(gifBuffer)
        } catch (err) {
            return void M.reply(
                `Couldn't convert the reaction GIF — ffmpeg must be installed on the host.`
            )
        }
        await M.reply(
            videoBuffer,
            MessageType.video,
            Mimetype.gif,
            [M.sender.jid, ...M.mentioned],
            `*@${M.sender.jid.split('@')[0]} ${grammar} ${M.mentioned
                .map((user) => (user === M.sender.jid ? 'Themselves' : `@${user.split('@')[0]}`))
                .join(', ')}*`
        )
    }
}
