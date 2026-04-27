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

/** Sort + dedupe + drop empties. Order-independent identity for bond keys. */
export const canonicalizeJids = (jids: Array<string | null | undefined>): string[] => {
    const out = new Set<string>()
    for (const j of jids) {
        if (!j) continue
        const t = j.trim()
        if (t) out.add(t)
    }
    return Array.from(out).sort()
}

export const bondKey = (members: string[]): string => members.slice().sort().join('|')

/** Base affinity for a bond — 20–79 range, deterministic per key. */
export const baseScoreForBondKey = (key: string): number => (hash32(key) % 60) + 20

/** Base rizz for a user — 20–49, deterministic. Salt prefix prevents
 * collision with bond hashes and gives a different distribution. */
export const baseRizzFor = (jid: string): number => (hash32(SHIP_PREFIX + jid) % 30) + 20

/** Resolve `!ship` participants.
 *
 * Rules:
 *   `!ship`                  → self-ship of caller
 *   `!ship @sender` only     → self-ship of caller (dedupe)
 *   `!ship @a` (a ≠ caller)  → self-ship of `a` (rizz of a)
 *   `!ship @a @b` (≠)        → bond {a,b}
 *   `!ship @a ... @e`        → bond up to 5 members; >5 truncates with harem flag
 *
 * Note: `!ship @a` alone shows a's profile rizz; to ship caller × a explicitly,
 * the caller mentions both themselves and a (or any 2+ distinct people).
 */
export const canonicalizeShip = (
    sender: string,
    mentioned: string[],
    quotedSender?: string | null
): Canonicalized => {
    const members = canonicalizeJids([quotedSender, ...mentioned])
    if (members.length === 0) return { kind: 'self', member: sender }
    if (members.length === 1) return { kind: 'self', member: members[0] }
    let m = members
    let harem = false
    if (m.length > MAX_BOND_SIZE) {
        m = m.slice(0, MAX_BOND_SIZE)
        harem = true
    }
    return { kind: 'bond', members: m, key: bondKey(m), harem }
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

/** Build the immutable insert payload for a fresh bond. Centralized so the
 * !ship and !react paths both create bonds the same way on first touch. */
const buildBondInsert = (sortedMembers: string[], key: string, now: Date) => ({
    _id: key,
    members: sortedMembers,
    size: sortedMembers.length,
    base: baseScoreForBondKey(key),
    shipCount: 0,
    shippers: [],
    firstShippedAt: now,
    lastShippedAt: now
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

/** Self-rizz score with the components broken out so !shiprank can show them. */
export const computeRizz = async (
    client: WAClient,
    jid: string
): Promise<RizzBreakdown> => {
    const rizz = await ensureRizz(client, jid)
    const outsiderCount = (rizz.outsiderShippers || []).length
    const outsiderTerm = Math.min(30, outsiderCount)

    const bonds = (await client.DB.bond.find({ members: jid })) as IBondModel[]
    let bondTerm = 0
    for (const bond of bonds) {
        const s = bondScore(bond)
        if (s > 50) bondTerm += (s - 50) / 10
    }

    const raw = rizz.baseRizz + outsiderTerm + bondTerm
    return {
        score: clamp(Math.round(raw), 1, 99),
        base: rizz.baseRizz,
        outsiderCount,
        outsiderTerm,
        bondCount: bonds.length,
        bondTerm: Math.round(bondTerm * 10) / 10
    }
}
