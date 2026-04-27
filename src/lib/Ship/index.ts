/** Ship core: deterministic scoring, persistent bonds, and rizz.
 *
 * Bond model: a set of 2–5 distinct JIDs. Identity is the canonical pipe-joined
 * sorted-JID key, so {A,B} === {B,A} and {A,B} ≠ {A,B,C}. The base is hashed
 * from the key once and never moves; growth is the per-sender clamped sum of
 * !react action deltas (see deltas.ts).
 *
 * Rizz model: per-user popularity. Computed at read time from a small base
 * + the count of distinct outsiders who have shipped this user + a fold over
 * bonds the user appears in. We never hash a JID with itself — a self-bond
 * would have half the entropy and isn't conceptually a relationship anyway.
 */
import crypto from 'crypto'
import { jidNormalizedUser } from 'baileys'
import WAClient from '../WAClient.js'
import { IBondModel, IUserRizzModel } from '../../typings/index.js'
import { PER_SENDER_CAP, REACTION_DELTAS } from './deltas.js'

export const MAX_BOND_SIZE = 5

export type Canonicalized =
    | { kind: 'self'; member: string }
    | { kind: 'bond'; members: string[]; key: string; harem: boolean }

const SHIP_PREFIX = 'rizz:'

const hash32 = (s: string): number => {
    const buf = crypto.createHash('sha1').update(s).digest()
    return buf.readUInt32BE(0)
}

/** JIDs contain `.` and `@` (e.g. `1234@s.whatsapp.net`). MongoDB rejects
 * `.` in field names and `$`/dot-paths confuse update operators, so we URL-
 * encode the JID before using it as a Map key. The encoding is reversible
 * but we never actually need to decode — we only iterate values. */
const encodeJidKey = (jid: string): string => encodeURIComponent(jid)

/** Normalize a single JID. Strips device suffixes (`:NN`) and yields the
 * canonical form Baileys uses internally. Falls back to the trimmed input
 * on malformed JIDs so callers never get an empty string.
 *
 * Why we expose this: WAClient normalizes `M.sender.jid` and
 * `M.quoted.sender` but leaves `M.mentioned[]`, `M.from`, and
 * `groupMetadata.participants[].id` raw. Any code that compares these
 * against bond.members or rizz._id (which are stored normalized) will
 * mismatch unless it normalizes first. */
export const normalizeJid = (jid: string | null | undefined): string => {
    if (!jid) return ''
    const t = jid.trim()
    if (!t) return ''
    try {
        return jidNormalizedUser(t)
    } catch {
        return t
    }
}

/** Normalize + sort + dedupe + drop empties. Order-independent identity for
 * bond keys. */
export const canonicalizeJids = (jids: Array<string | null | undefined>): string[] => {
    const out = new Set<string>()
    for (const j of jids) {
        const n = normalizeJid(j)
        if (n) out.add(n)
    }
    return Array.from(out).sort()
}

export const bondKey = (members: string[]): string => members.slice().sort().join('|')

/** Base affinity for a bond — 20–40 range, deterministic per key.
 *
 * Tight starting range is intentional: we don't want a brand-new pair to
 * land at 78% just because their JIDs happened to hash that way. Earned
 * growth (via !react) is what should move the score from "okay" to "fated".
 */
export const baseScoreForBondKey = (key: string): number => (hash32(key) % 21) + 20

/** Base rizz for a user — 20–40, deterministic. Salt prefix prevents
 * collision with bond hashes and gives a different distribution. */
export const baseRizzFor = (jid: string): number => (hash32(SHIP_PREFIX + jid) % 21) + 20

/** Resolve `!ship` participants.
 *
 * Core rule: **the sender is always part of any bond they create.** A bond
 * is the set of {sender} ∪ {everyone they named} after dedupe + normalize.
 *
 *   `!ship`                       → self-rizz of caller (no others named)
 *   `!ship @sender`               → self-rizz of caller (only self named)
 *   `!ship @a`                    → bond {caller, a}
 *   `!ship` quoting a             → bond {caller, a}            (quote == @-tag)
 *   `!ship @a @b`                 → bond {caller, a, b}         ← caller included
 *   `!ship @a @b @c`              → bond {caller, a, b, c}
 *   `!ship @a @b @c @d @e`        → bond {caller, a, b, c, d}; harem flag on
 *
 * Cap is 5 members total; if (1 + others) > 5 we keep the sender plus the
 * first MAX_BOND_SIZE-1 others (sorted JID order, deterministic) and set the
 * harem flag for the caption.
 */
export const canonicalizeShip = (
    sender: string,
    mentioned: string[],
    quotedSender?: string | null
): Canonicalized => {
    // Normalize sender once and exclude them from "others" so the count below
    // reflects only people *other than* the caller.
    const senderNorm = normalizeJid(sender) || sender
    const others = canonicalizeJids([quotedSender, ...mentioned]).filter(
        (j) => j !== senderNorm
    )

    if (others.length === 0) return { kind: 'self', member: senderNorm }

    const slotsForOthers = MAX_BOND_SIZE - 1
    let kept = others
    let harem = false
    if (kept.length > slotsForOthers) {
        kept = kept.slice(0, slotsForOthers)
        harem = true
    }
    const members = canonicalizeJids([senderNorm, ...kept])
    return { kind: 'bond', members, key: bondKey(members), harem }
}

/** Resolve `!react` participants. Sender is always included.
 *
 *   `!kiss`                 → self-action; no growth, GIF only.
 *   `!kiss @a`              → bond {sender, a}.
 *   `!kiss @sender`         → self-action (dedupe).
 *   `!kiss @a ... @d`       → bond {sender, a..d}. Cap 5 with harem flag.
 */
export const canonicalizeReact = (
    sender: string,
    mentioned: string[],
    quotedSender?: string | null
): Canonicalized => {
    const members = canonicalizeJids([sender, quotedSender, ...mentioned])
    if (members.length < 2) return { kind: 'self', member: sender }
    let m = members
    let harem = false
    if (m.length > MAX_BOND_SIZE) {
        m = m.slice(0, MAX_BOND_SIZE)
        harem = true
    }
    return { kind: 'bond', members: m, key: bondKey(m), harem }
}

/** Sum per-sender contributions, clamped to ±PER_SENDER_CAP. */
export const computeBondGrowth = (
    contributions: Map<string, string[]> | Record<string, string[]> | undefined | null
): number => {
    if (!contributions) return 0
    const entries: Array<[string, string[]]> =
        contributions instanceof Map
            ? Array.from(contributions.entries())
            : Object.entries(contributions)
    let total = 0
    for (const [, actions] of entries) {
        let net = 0
        for (const action of actions || []) {
            net += REACTION_DELTAS[action] ?? 0
        }
        if (net > PER_SENDER_CAP) net = PER_SENDER_CAP
        if (net < -PER_SENDER_CAP) net = -PER_SENDER_CAP
        total += net
    }
    return total
}

export const clamp = (n: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, n))

/** Final ship score for a stored bond, 1–99. */
export const bondScore = (bond: IBondModel): number =>
    clamp(Math.round(bond.base + computeBondGrowth(bond.contributions)), 1, 99)

/** Build the $setOnInsert payload for a fresh bond.
 *
 * IMPORTANT: only include fields that the same update isn't ALSO touching via
 * $set / $inc / $addToSet. MongoDB rejects an update with operators that
 * overlap on the same path ("Updating the path 'shipCount' would create a
 * conflict at 'shipCount'"). The fields this returns are the ones that are
 * either truly immutable (`_id`, `members`, `size`, `base`) or only set on
 * first insert and never touched again (`firstShippedAt`).
 *
 * Schema defaults supply the rest on insert: `shipCount` defaults to 0,
 * `shippers` to [], `lastShippedAt` to a fresh Date, `contributions` to a
 * fresh Map. Those defaults compose cleanly with $inc / $addToSet / $set
 * because they're applied during document construction, not via an update
 * operator.
 */
const buildBondInsert = (sortedMembers: string[], key: string, now: Date) => ({
    _id: key,
    members: sortedMembers,
    size: sortedMembers.length,
    base: baseScoreForBondKey(key),
    firstShippedAt: now
})

/** Build the rizz-credit bulk-write ops for a `!ship` invocation. Each
 * non-sender member gets a single upsert that creates the rizz doc if it
 * doesn't exist and adds the shipper to outsiderShippers atomically. */
const buildRizzCreditOps = (sortedMembers: string[], senderJid: string) =>
    sortedMembers
        .filter((m) => m !== senderJid)
        .map((m) => ({
            updateOne: {
                filter: { _id: m },
                update: {
                    $setOnInsert: { _id: m, baseRizz: baseRizzFor(m) },
                    $addToSet: { outsiderShippers: senderJid }
                },
                upsert: true
            }
        }))

/** Atomic upsert that creates the bond on first touch. Used by the !react
 * hook (no invocation tracking). The !ship path uses `shipBond` instead, which
 * folds the upsert and the invocation bookkeeping into one round-trip.
 * `contributions` is intentionally omitted from $setOnInsert so the schema's
 * `default: () => new Map()` gets used. */
export const ensureBond = async (
    client: WAClient,
    members: string[]
): Promise<IBondModel> => {
    const sortedMembers = members.slice().sort()
    const key = sortedMembers.join('|')
    return (await client.DB.bond.findOneAndUpdate(
        { _id: key },
        { $setOnInsert: buildBondInsert(sortedMembers, key, new Date()) },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )) as IBondModel
}

/** Single-call !ship: upsert bond, bump shipCount, record shipper, and
 * bulk-credit each non-sender member's rizz with the shipper as an outsider.
 * The bond write and the rizz bulk-write target different collections and are
 * fired in parallel, so wall-clock cost is one round-trip regardless of bond
 * size. Returns the post-update bond doc for rendering. */
export const shipBond = async (
    client: WAClient,
    senderJid: string,
    members: string[]
): Promise<IBondModel> => {
    const sortedMembers = members.slice().sort()
    const key = sortedMembers.join('|')
    const now = new Date()
    const rizzOps = buildRizzCreditOps(sortedMembers, senderJid)

    const [bond] = await Promise.all([
        client.DB.bond.findOneAndUpdate(
            { _id: key },
            {
                $setOnInsert: buildBondInsert(sortedMembers, key, now),
                $set: { lastShippedAt: now },
                $inc: { shipCount: 1 },
                $addToSet: { shippers: senderJid }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ),
        rizzOps.length ? client.DB.rizz.bulkWrite(rizzOps) : Promise.resolve()
    ])
    return bond as IBondModel
}

/** Single-call !react contribution: upsert bond + record the action in one
 * round-trip. Idempotent on `(sender, action)` — spamming the same action
 * does nothing extra. */
export const reactBond = async (
    client: WAClient,
    senderJid: string,
    members: string[],
    action: string
): Promise<IBondModel | null> => {
    if (!(action in REACTION_DELTAS)) return null
    const sortedMembers = members.slice().sort()
    const key = sortedMembers.join('|')
    const encoded = encodeJidKey(senderJid)
    const now = new Date()
    return (await client.DB.bond.findOneAndUpdate(
        { _id: key },
        {
            $setOnInsert: buildBondInsert(sortedMembers, key, now),
            $addToSet: { [`contributions.${encoded}`]: action }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )) as IBondModel
}

/** Fetch (or create) the rizz doc for a user. */
export const ensureRizz = async (
    client: WAClient,
    jid: string
): Promise<IUserRizzModel> => {
    const baseRizz = baseRizzFor(jid)
    return (await client.DB.rizz.findOneAndUpdate(
        { _id: jid },
        { $setOnInsert: { _id: jid, baseRizz, outsiderShippers: [] } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )) as IUserRizzModel
}

export interface RizzBreakdown {
    score: number
    base: number
    outsiderCount: number
    outsiderTerm: number
    bondCount: number
    bondTerm: number
}

/** Caps for the rizz formula, exported for tests / future tuning.
 *
 * baseRizz (20–40) + outsiderTerm (0–OUTSIDER_CAP) + bondTerm (0–BOND_CAP)
 * → 40 + 30 + 30 = 100 raw, clamped to 99.
 *
 * Calibration: hitting 99 should take *real* social investment. Outsiders
 * accrue at +1 each, capped at 30 distinct shippers. Bond contribution comes
 * only from earned !react growth (NOT random base), capped at PER_BOND_RIZZ_CAP
 * per bond and BOND_CAP across all bonds — so one runaway pair can't dominate
 * and a popular user still has to be in many active relationships to max out.
 */
export const OUTSIDER_CAP = 30
export const PER_BOND_RIZZ_CAP = 5
export const BOND_CAP = 30

/** Pure rizz formula. The two contribution terms are designed so that:
 *
 *  - The bond contribution is driven by **growth** (actual !react affection),
 *    NOT bondScore. A freshly-created bond has growth 0 and contributes
 *    nothing — so a third party shipping you doesn't double-credit your rizz
 *    via "+1 outsider AND +(random_base−50)/10". The random base is RNG; only
 *    earned affection moves rizz.
 *  - Each individual bond is capped at PER_BOND_RIZZ_CAP so one runaway pair
 *    can't dominate. Sum is capped at BOND_CAP.
 *  - Outsider count is linear up to OUTSIDER_CAP — every new shipper adds
 *    exactly +1 until the cap, matching the user-facing promise.
 */
export const computeRizzScore = (
    baseRizz: number,
    outsiderCount: number,
    bondGrowths: number[]
): RizzBreakdown => {
    const outsiderTerm = Math.min(OUTSIDER_CAP, outsiderCount)
    let bondTerm = 0
    for (const g of bondGrowths) {
        if (g > 0) bondTerm += Math.min(PER_BOND_RIZZ_CAP, g)
    }
    bondTerm = Math.min(BOND_CAP, bondTerm)
    return {
        score: clamp(Math.round(baseRizz + outsiderTerm + bondTerm), 1, 99),
        base: baseRizz,
        outsiderCount,
        outsiderTerm,
        bondCount: bondGrowths.length,
        bondTerm
    }
}

/** Self-rizz score with the components broken out so !shiprank can show them. */
export const computeRizz = async (
    client: WAClient,
    jid: string
): Promise<RizzBreakdown> => {
    const rizz = await ensureRizz(client, jid)
    const bonds = (await client.DB.bond.find({ members: jid })) as IBondModel[]
    const growths = bonds.map((b) => computeBondGrowth(b.contributions))
    return computeRizzScore(
        rizz.baseRizz,
        (rizz.outsiderShippers || []).length,
        growths
    )
}
