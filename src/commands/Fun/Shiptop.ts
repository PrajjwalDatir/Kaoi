import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IBondModel, IUserRizzModel, ISimplifiedMessage } from '../../typings/index.js'
import { baseRizzFor, bondScore, clamp } from '../../lib/Ship/index.js'
import { MessageType } from '../../lib/types.js'

const tagFor = (jid: string): string => `@${jid.split('@')[0]}`

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'shiptop',
            description: 'Group leaderboards: top bonds, top rizz, biggest playboys',
            category: 'fun',
            usage: `${client.config.prefix}shiptop`,
            baseXp: 10
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        // Restrict the leaderboard to people involved with the current chat.
        // For groups: members of the group. For DMs: just the two participants.
        const scope = new Set<string>()
        if (M.groupMetadata) {
            for (const p of M.groupMetadata.participants) scope.add(p.id)
        } else {
            scope.add(M.sender.jid)
            scope.add(M.from)
        }
        // The bot is technically a chat participant but should never appear
        // in romance leaderboards.
        const botJid = this.client.user?.jid
        if (botJid) scope.delete(botJid)

        // Bot-exclusion happens at the DB layer ($nin on the multikey members
        // array); the in-memory all-in-scope filter then drops any bond that
        // bridges to people outside this chat.
        const scopeArr = Array.from(scope)
        const query = botJid
            ? { members: { $in: scopeArr, $nin: [botJid] } }
            : { members: { $in: scopeArr } }
        const allBonds = (await this.client.DB.bond.find(query)) as IBondModel[]
        const bonds = allBonds.filter((b) => b.members.every((m) => scope.has(m)))

        // Score every bond once and cache by id for the rizz fold below.
        // This used to be N+1 (Shiptop called computeRizz per user, which
        // re-queried bonds containing that user); now it's a single bond
        // sweep + a single rizz fetch. We sort `scored` in place — the order
        // doesn't matter for the bondsByMember construction below.
        const scored = bonds.map((b) => ({ b, score: bondScore(b) }))
        scored.sort((a, b) => b.score - a.score || b.b.shipCount - a.b.shipCount)
        const topBonds = scored.slice(0, 5)
        const mentions = new Set<string>()

        // Per-user rollup: ship count + appearances.
        const appearance = new Map<string, { count: number; shipped: number }>()
        for (const b of bonds) {
            for (const m of b.members) {
                const cur = appearance.get(m) || { count: 0, shipped: 0 }
                cur.count += b.shipCount
                cur.shipped += 1
                appearance.set(m, cur)
            }
        }
        const playboys = Array.from(appearance.entries())
            .sort((a, b) => b[1].shipped - a[1].shipped || b[1].count - a[1].count)
            .slice(0, 5)

        // Top rizz, in-memory. We need each candidate's rizz doc (for outsider
        // count) plus the >50 contribution from every bond they appear in.
        // Bonds were already scored above; group them by member to fold
        // without further DB calls.
        const rizzCandidates = Array.from(appearance.keys())
        const bondsByMember = new Map<string, Array<{ b: IBondModel; score: number }>>()
        for (const entry of scored) {
            for (const m of entry.b.members) {
                const arr = bondsByMember.get(m) || []
                arr.push(entry)
                bondsByMember.set(m, arr)
            }
        }
        const rizzDocs = rizzCandidates.length
            ? ((await this.client.DB.rizz.find({
                  _id: { $in: rizzCandidates }
              })) as IUserRizzModel[])
            : []
        const rizzByJid = new Map<string, IUserRizzModel>()
        for (const r of rizzDocs) rizzByJid.set(r._id, r)

        const rizzScored: Array<{ jid: string; score: number }> = []
        for (const jid of rizzCandidates) {
            const r = rizzByJid.get(jid)
            const base = r?.baseRizz ?? baseRizzFor(jid)
            const outsiders = (r?.outsiderShippers || []).length
            const outsiderTerm = Math.min(30, outsiders)
            let bondTerm = 0
            for (const e of bondsByMember.get(jid) || []) {
                if (e.score > 50) bondTerm += (e.score - 50) / 10
            }
            rizzScored.push({
                jid,
                score: clamp(Math.round(base + outsiderTerm + bondTerm), 1, 99)
            })
        }
        rizzScored.sort((a, b) => b.score - a.score)
        const topRizz = rizzScored.slice(0, 5)

        const lines: string[] = []
        lines.push(`🏆 *Ship Leaderboard* 🏆`)
        lines.push(`─────────────────────`)

        if (topBonds.length === 0) {
            lines.push(`_No bonds yet in this chat. Use !ship to start._`)
        } else {
            lines.push(`*Top Bonds*`)
            topBonds.forEach((entry, i) => {
                const tags = entry.b.members.map((m) => {
                    mentions.add(m)
                    return tagFor(m)
                }).join(' × ')
                lines.push(`${i + 1}. ${tags} — *${entry.score}%*`)
            })
            lines.push(``)
        }

        if (topRizz.length) {
            lines.push(`*Top Rizz*`)
            topRizz.forEach((entry, i) => {
                mentions.add(entry.jid)
                lines.push(`${i + 1}. ${tagFor(entry.jid)} — *${entry.score}%*`)
            })
            lines.push(``)
        }

        if (playboys.length) {
            lines.push(`*Most-Shipped*`)
            playboys.forEach(([jid, stats], i) => {
                mentions.add(jid)
                lines.push(`${i + 1}. ${tagFor(jid)} — ${stats.shipped} bonds, ${stats.count} ships`)
            })
        }

        await M.reply(lines.join('\n'), MessageType.text, undefined, Array.from(mentions))
    }
}
