import { MessageType, Mimetype } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'
import {
    canonicalizeShip,
    computeBondGrowth,
    computeRizz,
    shipBond
} from '../../lib/Ship/index.js'

interface ShipGifEntry {
    id: number
    shipPercent: string
    gifLink: string
}

const tagFor = (jid: string): string => `@${jid.split('@')[0]}`

const flavorForBond = (pct: number): string => {
    if (pct < 10) return 'Run. Run far. 🚩'
    if (pct < 25) return "There's still time to reconsider your choices."
    if (pct < 50) return 'Good enough, I guess! 💫'
    if (pct < 75) return "Stay together and you'll find a way ⭐️"
    if (pct < 90) return 'Amazing! You two will be a good couple 💖'
    if (pct < 99) return 'Fated to be together 💙'
    return 'Soulmate-tier. The stars themselves are jealous. 💞'
}

const flavorForRizz = (pct: number): string => {
    if (pct < 20) return 'Severely undersold. Touch grass, then try again. 🌱'
    if (pct < 40) return 'A diamond in the rough.'
    if (pct < 60) return 'Solid presence. People know who you are.'
    if (pct < 80) return 'Local heartthrob. 💘'
    if (pct < 95) return 'Certified menace. Everybody is shipping you. 🔥'
    return 'Rizz incarnate. Mortals quake. ✨'
}

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'ship',
            description: `Ship 💖 People`,
            category: 'fun',
            usage: `${client.config.prefix}ship [tag user(s)]`,
            baseXp: 50
        })
    }

    private pickGif = (percentage: number): string | null => {
        const data = JSON.parse((this.client.assets.get('ship') as Buffer)?.toString()) as {
            shipJson: ShipGifEntry[]
        }
        const candidates = data.shipJson.filter(
            (entry) => Math.abs(parseInt(entry.shipPercent) - percentage) <= 10
        )
        if (!candidates.length) return null
        return candidates[Math.floor(Math.random() * candidates.length)].gifLink
    }

    private sendWithGif = async (
        M: ISimplifiedMessage,
        percentage: number,
        mentions: string[],
        caption: string
    ): Promise<void> => {
        const gifLink = this.pickGif(percentage)
        if (!gifLink) {
            await M.reply(caption, MessageType.text, undefined, mentions)
            return
        }
        try {
            const gifBuf = await this.client.getBuffer(gifLink)
            const videoBuf = await this.client.util.GIFBufferToVideoBuffer(gifBuf)
            await M.reply(videoBuf, MessageType.video, Mimetype.gif, mentions, caption)
        } catch {
            // Upstream gif providers occasionally fail; fall back to text so
            // the score still lands.
            await M.reply(caption, MessageType.text, undefined, mentions)
        }
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        const resolved = canonicalizeShip(M.sender.jid, M.mentioned, M.quoted?.sender)

        if (resolved.kind === 'self') {
            const target = resolved.member
            const breakdown = await computeRizz(this.client, target)
            const pct = breakdown.score
            const isSelf = target === M.sender.jid
            const header = isSelf ? '✨ *Your Rizz* ✨' : `✨ *${tagFor(target)}'s Rizz* ✨`
            let caption = `${header}\n`
            caption += `\t\t---------------------------------\n`
            caption += `\t\t\t\t\t*Rizz : ${pct}%*\n`
            caption += `\t\t---------------------------------\n`
            caption += `Base ${breakdown.base} · Outsiders ${breakdown.outsiderCount} (+${breakdown.outsiderTerm}) · Bonds +${breakdown.bondTerm}\n`
            caption += `${flavorForRizz(pct)}`
            await this.sendWithGif(M, pct, [target], caption)
            return
        }

        const bond = await shipBond(this.client, M.sender.jid, resolved.members)
        // Compute growth once and derive pct from it. Calling bondScore() then
        // computeBondGrowth() separately would iterate the contributions Map
        // twice — same answer, double the work.
        const growth = computeBondGrowth(bond.contributions)
        const raw = bond.base + growth
        const pct = Math.max(1, Math.min(99, Math.round(raw)))
        // The displayed ShipCent is clamped to 1–99; raw can exceed that. Show
        // "(capped)" so users don't think 79+30 should be 109 — they're meant
        // to read this as "maxed out".
        const capped = raw > 99 || raw < 1
        const tags = resolved.members.map(tagFor).join('  ×  ')
        let caption = `\t❣️ *Matchmaking...* ❣️\n`
        caption += `\t\t---------------------------------\n`
        caption += `${tags}\n`
        if (resolved.harem) caption += `\t\t_Harem mode (top ${resolved.members.length})_\n`
        caption += `\t\t---------------------------------\n`
        caption += `\t\t\t\t\t*ShipCent : ${pct}%${capped ? ' _(capped)_' : ''}*\n`
        caption += `Base ${bond.base} · Growth ${growth >= 0 ? '+' : ''}${growth}\n`
        caption += `${flavorForBond(pct)}`
        await this.sendWithGif(M, pct, resolved.members, caption)
    }
}
