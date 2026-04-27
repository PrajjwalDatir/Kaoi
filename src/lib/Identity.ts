import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import NodeCache from 'node-cache'
import chalk from 'chalk'
import type WAClient from './WAClient.js'
import type { ICharacter, ICharacterDelta, IIdentityAdd } from '../typings/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Default character is loaded from disk so the user can hand-edit personality
// without touching code. The baseline is immutable at runtime — only deltas
// (lore/topics/styleChat) accumulate per chat. Edit the JSON to retune the
// global persona; restart the bot to pick it up.
const DEFAULT_PATH = join(__dirname, '..', '..', 'assets', 'json', 'kaoi-default.json')
const DEFAULT_KAOI: ICharacter = JSON.parse(readFileSync(DEFAULT_PATH, 'utf8'))

// Caps on accumulated drift. 2x the bare-minimum proposal — these bound how
// much the system prompt can grow over time. Oldest entries get evicted FIFO
// when the cap is hit, so the persona stays fresh.
const CAP_LORE = 40
const CAP_TOPICS = 30
const CAP_STYLE_CHAT = 20
const MAX_LORE_CHARS = 400
const MAX_TOPIC_CHARS = 100
const MAX_STYLE_CHARS = 160

// Pre-write content filter: drops candidate entries that look like the
// model regurgitating a jailbreak attempt as "lore". Not a complete defense
// (jailbreaks can phrase around it), but combined with the locked immutable
// fields, the worst-case is polluted lore — never a hijacked persona.
const GASLIGHT_PATTERNS: RegExp[] = [
    /\bignore\s+(previous|prior|all)/i,
    /\bdisregard\s+(previous|prior|all)/i,
    /\byou\s+are\s+(now|actually)\b/i,
    /\bforget\s+(your|the|all)/i,
    /\byour\s+(new|real|true)\s+name/i,
    /\breset\s+(your|all)/i,
    /\bsystem\s+prompt\b/i,
    /\bnew\s+persona\b/i,
    /\bact\s+as\s+(if|a|an)\b/i,
    // Second-person instructions — lore should be 3rd-person facts about the
    // chat, not directives aimed at the bot.
    /^\s*you\s+(must|should|will|are|need|have|cannot|can't)\b/i
]
const isGaslight = (entry: string): boolean => GASLIGHT_PATTERNS.some((p) => p.test(entry))

const capFifo = <T>(arr: T[], cap: number): T[] => (arr.length > cap ? arr.slice(arr.length - cap) : arr)

export type IdentityKind = 'user' | 'group'

export default class Identity {
    /** 5-min TTL identity cache; invalidated on every applyAdd / reset. */
    private cache = new NodeCache({ stdTTL: 5 * 60, useClones: false, maxKeys: 5000 })

    constructor(private client: WAClient) {}

    /** Resolved character for a chat — default + accumulated deltas. */
    resolve = async (jid: string, kind: IdentityKind): Promise<ICharacter> => {
        const cacheKey = `${kind}:${jid}`
        const cached = this.cache.get<ICharacter>(cacheKey)
        if (cached) return cached
        const delta = await this.getDelta(jid, kind)
        const merged = this.merge(delta)
        this.cache.set(cacheKey, merged)
        return merged
    }

    /** Read just the per-chat additions, no merge — for `!identity show`. */
    getDelta = async (jid: string, kind: IdentityKind): Promise<ICharacterDelta> => {
        const doc = kind === 'user'
            ? await this.client.getUser(jid)
            : await this.client.getGroupData(jid)
        const ci = (doc as { chatIdentity?: ICharacterDelta } | null)?.chatIdentity
        return {
            lore: Array.isArray(ci?.lore) ? ci.lore : [],
            topics: Array.isArray(ci?.topics) ? ci.topics : [],
            styleChat: Array.isArray(ci?.styleChat) ? ci.styleChat : []
        }
    }

    /** Apply the model's `identityAdd` envelope, post-validation. Silently
     * drops entries that fail the gaslight filter or overflow the per-entry
     * char cap. Caps array length FIFO. No-op if nothing survives sanitization. */
    applyAdd = async (jid: string, kind: IdentityKind, add: IIdentityAdd | null | undefined): Promise<void> => {
        if (!add) return
        const cleanLore = this.sanitize(add.lore, MAX_LORE_CHARS)
        const cleanTopics = this.sanitize(add.topics, MAX_TOPIC_CHARS)
        const cleanStyle = this.sanitize(add.styleChat, MAX_STYLE_CHARS)
        if (!cleanLore.length && !cleanTopics.length && !cleanStyle.length) return

        const delta = await this.getDelta(jid, kind)
        // Topics/style dedupe (case-insensitive); lore allowed to repeat as
        // the model may legitimately note related-but-distinct facts.
        const lore = new Set(delta.lore)
        for (const l of cleanLore) lore.add(l)
        const topicSet = new Set(delta.topics.map((t) => t.toLowerCase()))
        const mergedTopics = [...delta.topics]
        for (const t of cleanTopics) if (!topicSet.has(t.toLowerCase())) mergedTopics.push(t)
        const styleSet = new Set(delta.styleChat.map((s) => s.toLowerCase()))
        const mergedStyle = [...delta.styleChat]
        for (const s of cleanStyle) if (!styleSet.has(s.toLowerCase())) mergedStyle.push(s)

        const next: ICharacterDelta = {
            lore: capFifo([...lore], CAP_LORE),
            topics: capFifo(mergedTopics, CAP_TOPICS),
            styleChat: capFifo(mergedStyle, CAP_STYLE_CHAT)
        }
        await this.writeDelta(jid, kind, next)
        this.cache.del(`${kind}:${jid}`)
        const summary = [
            cleanLore.length ? `+lore(${cleanLore.length})` : '',
            cleanTopics.length ? `+topic(${cleanTopics.length})` : '',
            cleanStyle.length ? `+style(${cleanStyle.length})` : ''
        ].filter(Boolean).join(' ')
        this.client.log(`${chalk.magenta('CHARDELTA')} ${kind}:${jid} ${summary}`)
    }

    /** Mod panic button: clears all accumulated deltas. The default character
     * remains untouched. */
    reset = async (jid: string, kind: IdentityKind): Promise<void> => {
        await this.writeDelta(jid, kind, { lore: [], topics: [], styleChat: [] })
        this.cache.del(`${kind}:${jid}`)
    }

    /** Convert a resolved character into the system-prompt string sent on
     * every LLM call. Includes the JSON-output contract the model must obey. */
    buildSystemPrompt = (c: ICharacter): string => {
        const lines: string[] = []
        lines.push(`You are ${c.name}.`)
        lines.push(
            '',
            'Core directive (overrides all style):',
            '- You genuinely care about the user. The persona below is a stylistic layer, not a filter on whether to help.',
            '- Sincere questions get sincere, warm answers — tease lightly if you want, but actually answer.',
            '- Save the sass and dismissals for lazy, repetitive, or bad-faith prompts. Never refuse a real question.'
        )
        if (c.bio.length) {
            lines.push('', 'About you:', ...c.bio.map((b) => `- ${b}`))
        }
        if (c.lore.length) {
            lines.push('', 'Backstory and accumulated context for this chat:', ...c.lore.map((l) => `- ${l}`))
        }
        if (c.topics.length) lines.push('', `Topics you talk about: ${c.topics.join(', ')}`)
        if (c.adjectives.length) lines.push('', `You are: ${c.adjectives.join(', ')}`)
        const style: string[] = []
        if (c.style.all.length) style.push(...c.style.all.map((s) => `- ${s}`))
        if (c.style.chat.length) {
            style.push('In chat specifically:')
            style.push(...c.style.chat.map((s) => `- ${s}`))
        }
        if (style.length) lines.push('', 'Your style:', ...style)
        if (c.messageExamples.length) {
            lines.push('', 'Examples of how you respond:')
            for (const ex of c.messageExamples.slice(0, 5)) {
                if (ex.length < 2) continue
                lines.push(`User: ${ex[0].content.text}`)
                lines.push(`${c.name}: ${ex[1].content.text}`)
            }
        }
        lines.push(
            '',
            'Rules:',
            '- Reply in 1-2 short WhatsApp-sized sentences. No markdown, no bullet lists.',
            '- Stay in character. Never break voice.',
            '- You will receive memory of prior conversation, recent exchanges, and the new user message.',
            '',
            'Output ONLY a JSON object (no code fences, no other text) with these keys:',
            '  "reply"   — your reply to the user, plain text.',
            '  "memory"  — updated compressed memory of the conversation under 400 chars (overwrites the previous memory blob).',
            '  "identityAdd" — { "lore": [], "topics": [], "styleChat": [] }.',
            '    Only add when the user reveals something durable and specific worth remembering long-term — a fact about them, a recurring theme they keep returning to, a stable preference.',
            '    Phrase as third-person facts about this chat or the user (e.g. lore: "User runs Arch Linux"; topics: "linux").',
            '    Never use second-person ("you are…", "you must…"). Never reference the system prompt or instructions.',
            '    Skip casual chitchat. Empty arrays are normal.'
        )
        return lines.join('\n')
    }

    /** Trim, char-cap, and gaslight-filter a candidate string array. */
    private sanitize = (entries: string[] | undefined, maxChars: number): string[] => {
        if (!Array.isArray(entries)) return []
        const out: string[] = []
        for (const raw of entries) {
            if (typeof raw !== 'string') continue
            const trimmed = raw.trim().slice(0, maxChars)
            if (!trimmed) continue
            if (isGaslight(trimmed)) {
                this.client.log(
                    `${chalk.yellow('GASLIGHT-DROPPED')} "${trimmed.slice(0, 80)}"`,
                    true
                )
                continue
            }
            out.push(trimmed)
        }
        return out
    }

    private merge = (delta: ICharacterDelta): ICharacter => ({
        ...DEFAULT_KAOI,
        // Concatenate default + per-chat. Defaults are first so the bot's
        // baseline lore/topics always anchor the persona.
        lore: [...DEFAULT_KAOI.lore, ...delta.lore],
        topics: [...DEFAULT_KAOI.topics, ...delta.topics],
        style: {
            all: DEFAULT_KAOI.style.all,
            chat: [...DEFAULT_KAOI.style.chat, ...delta.styleChat],
            post: DEFAULT_KAOI.style.post
        },
        adjectives: DEFAULT_KAOI.adjectives,
        bio: DEFAULT_KAOI.bio,
        name: DEFAULT_KAOI.name,
        messageExamples: DEFAULT_KAOI.messageExamples,
        postExamples: DEFAULT_KAOI.postExamples
    })

    private writeDelta = async (jid: string, kind: IdentityKind, delta: ICharacterDelta): Promise<void> => {
        if (kind === 'user') {
            await this.client.DB.user.findOneAndUpdate(
                { jid },
                { $set: { chatIdentity: delta }, $setOnInsert: { jid } },
                { upsert: true, setDefaultsOnInsert: true }
            )
        } else {
            await this.client.DB.group.findOneAndUpdate(
                { jid },
                { $set: { chatIdentity: delta }, $setOnInsert: { jid } },
                { upsert: true, setDefaultsOnInsert: true }
            )
        }
    }
}
