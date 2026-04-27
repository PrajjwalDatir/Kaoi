/** One-off migration to bring legacy ship data in line with the current
 * canonicalization + scoring rules.
 *
 * What changed and what this script does:
 *
 *  1. **JID normalization.** `canonicalizeJids` now runs every JID through
 *     `jidNormalizedUser` (strips device suffixes like `:5`). Older bonds
 *     might have members like `1234:5@s.whatsapp.net` while newer code
 *     produces `1234@s.whatsapp.net` for the same human. We normalize all
 *     `members` and `_id` values, and merge any bonds that collide after
 *     normalization (union shippers + contributions, sum shipCount, take
 *     min/max of the dates).
 *
 *  2. **Base ranges narrowed.** `baseScoreForBondKey` is now `% 21 + 20` and
 *     `baseRizzFor` is also `% 21 + 20`, both tighter than the old wider
 *     ranges. We recompute and persist `base`/`baseRizz` so existing bonds
 *     and users sit in the new range.
 *
 *  3. **Rizz docs**: same normalization for `_id` and `outsiderShippers`,
 *     plus base recomputation and dedupe of the outsider set.
 *
 * Idempotent: re-running on already-migrated data does nothing meaningful
 * (bases are already correct, JIDs already normalized).
 */
import { jidNormalizedUser } from 'baileys'
import WAClient from '../WAClient.js'
import { IBondModel, IUserRizzModel } from '../../typings/index.js'
import { baseRizzFor, baseScoreForBondKey } from './index.js'

export interface ShipMigrationReport {
    bondsScanned: number
    bondsRekeyed: number
    bondsMerged: number
    bondsBaseUpdated: number
    rizzScanned: number
    rizzRekeyed: number
    rizzMerged: number
    rizzBaseUpdated: number
}

const safeNormalize = (j: string): string => {
    try {
        return jidNormalizedUser(j)
    } catch {
        return j
    }
}

/** Pull the contributions Map out of either a Mongoose document or a plain
 * object, returning a plain Map<string, string[]>. Mongoose Maps and plain
 * objects both turn up depending on how the doc was hydrated. */
const readContribs = (
    contribs: Map<string, string[]> | Record<string, string[]> | undefined | null
): Map<string, string[]> => {
    const out = new Map<string, string[]>()
    if (!contribs) return out
    const entries: Array<[string, string[]]> =
        contribs instanceof Map
            ? Array.from(contribs.entries())
            : Object.entries(contribs as Record<string, string[]>)
    for (const [k, v] of entries) {
        out.set(k, Array.from(new Set(v || [])))
    }
    return out
}

/** Fold contributions from `src` into `dst`, deduping per-sender action sets. */
const mergeContribs = (dst: Map<string, string[]>, src: Map<string, string[]>): void => {
    for (const [k, v] of src.entries()) {
        const existing = dst.get(k) || []
        dst.set(k, Array.from(new Set([...existing, ...v])))
    }
}

const minDate = (a: Date | string | undefined, b: Date | string | undefined): Date => {
    const ta = a ? +new Date(a) : Number.POSITIVE_INFINITY
    const tb = b ? +new Date(b) : Number.POSITIVE_INFINITY
    const t = Math.min(ta, tb)
    return Number.isFinite(t) ? new Date(t) : new Date()
}

const maxDate = (a: Date | string | undefined, b: Date | string | undefined): Date => {
    const ta = a ? +new Date(a) : 0
    const tb = b ? +new Date(b) : 0
    return new Date(Math.max(ta, tb))
}

export const migrateShipData = async (
    client: WAClient
): Promise<ShipMigrationReport> => {
    const report: ShipMigrationReport = {
        bondsScanned: 0,
        bondsRekeyed: 0,
        bondsMerged: 0,
        bondsBaseUpdated: 0,
        rizzScanned: 0,
        rizzRekeyed: 0,
        rizzMerged: 0,
        rizzBaseUpdated: 0
    }

    // ---- Bonds ----
    // Snapshot all bond _ids upfront — we may delete and re-create some, and
    // we don't want to traverse mutating state with a cursor.
    const allBonds = (await client.DB.bond.find({})) as IBondModel[]
    for (const bond of allBonds) {
        report.bondsScanned++
        const oldKey = bond._id
        const normalizedMembers = Array.from(
            new Set((bond.members || []).map(safeNormalize))
        ).sort()
        // Edge case: empty/invalid members — skip (shouldn't happen but
        // protects against legacy bad rows).
        if (normalizedMembers.length < 2) continue
        const newKey = normalizedMembers.join('|')
        const newBase = baseScoreForBondKey(newKey)
        const keyChanged = newKey !== oldKey

        if (!keyChanged) {
            if (bond.base !== newBase) {
                await client.DB.bond.updateOne(
                    { _id: oldKey },
                    { $set: { base: newBase } }
                )
                report.bondsBaseUpdated++
            }
            continue
        }

        // Key changed: either rename in place (no collision) or merge with
        // an existing canonical bond.
        const target = (await client.DB.bond.findOne({ _id: newKey })) as IBondModel | null
        const srcContribs = readContribs(bond.contributions)

        if (target) {
            const mergedContribs = readContribs(target.contributions)
            mergeContribs(mergedContribs, srcContribs)
            const mergedShippers = Array.from(
                new Set([
                    ...(target.shippers || []).map(safeNormalize),
                    ...(bond.shippers || []).map(safeNormalize)
                ])
            )
            await client.DB.bond.updateOne(
                { _id: newKey },
                {
                    $set: {
                        members: normalizedMembers,
                        size: normalizedMembers.length,
                        base: newBase,
                        shippers: mergedShippers,
                        contributions: Object.fromEntries(mergedContribs),
                        firstShippedAt: minDate(target.firstShippedAt, bond.firstShippedAt),
                        lastShippedAt: maxDate(target.lastShippedAt, bond.lastShippedAt)
                    },
                    $inc: { shipCount: bond.shipCount || 0 }
                }
            )
            await client.DB.bond.deleteOne({ _id: oldKey })
            report.bondsMerged++
        } else {
            // Rename: Mongoose can't change _id in place, so we insert a new
            // doc with the canonical key and delete the old one.
            await client.DB.bond.create({
                _id: newKey,
                members: normalizedMembers,
                size: normalizedMembers.length,
                base: newBase,
                shipCount: bond.shipCount || 0,
                firstShippedAt: bond.firstShippedAt || new Date(),
                lastShippedAt: bond.lastShippedAt || new Date(),
                shippers: Array.from(
                    new Set((bond.shippers || []).map(safeNormalize))
                ),
                contributions: Object.fromEntries(srcContribs)
            })
            await client.DB.bond.deleteOne({ _id: oldKey })
            report.bondsRekeyed++
        }
    }

    // ---- Rizz docs ----
    const allRizz = (await client.DB.rizz.find({})) as IUserRizzModel[]
    for (const rizz of allRizz) {
        report.rizzScanned++
        const oldId = rizz._id
        const newId = safeNormalize(oldId)
        const newBase = baseRizzFor(newId)
        const normalizedOutsiders = Array.from(
            new Set((rizz.outsiderShippers || []).map(safeNormalize))
        )
        const idChanged = newId !== oldId

        if (!idChanged) {
            const dedupedSizeChanged =
                normalizedOutsiders.length !== (rizz.outsiderShippers || []).length
            if (rizz.baseRizz !== newBase || dedupedSizeChanged) {
                await client.DB.rizz.updateOne(
                    { _id: oldId },
                    {
                        $set: {
                            baseRizz: newBase,
                            outsiderShippers: normalizedOutsiders
                        }
                    }
                )
                report.rizzBaseUpdated++
            }
            continue
        }

        const target = (await client.DB.rizz.findOne({ _id: newId })) as IUserRizzModel | null
        if (target) {
            const mergedOutsiders = Array.from(
                new Set([
                    ...(target.outsiderShippers || []).map(safeNormalize),
                    ...normalizedOutsiders
                ])
            )
            await client.DB.rizz.updateOne(
                { _id: newId },
                {
                    $set: {
                        baseRizz: newBase,
                        outsiderShippers: mergedOutsiders
                    }
                }
            )
            await client.DB.rizz.deleteOne({ _id: oldId })
            report.rizzMerged++
        } else {
            await client.DB.rizz.create({
                _id: newId,
                baseRizz: newBase,
                outsiderShippers: normalizedOutsiders
            })
            await client.DB.rizz.deleteOne({ _id: oldId })
            report.rizzRekeyed++
        }
    }

    return report
}
