import { model, Schema } from 'mongoose'
import { IBondModel } from '../../../typings/index.js'

const BondSchema = new Schema(
    {
        // Canonical pipe-joined sorted JIDs. Computed by bondKey() in the Ship lib.
        // Declaring `_id: String` overrides Mongoose's default ObjectId. The
        // `_id: false` schema option is intentionally NOT set — it's a no-op
        // on top-level schemas and would only confuse readers.
        _id: { type: String, required: true },
        members: { type: [String], required: true, index: true },
        size: { type: Number, required: true },
        // hash(_id) % 60 + 20. Immutable; cached to avoid recomputing on every read.
        base: { type: Number, required: true },
        shipCount: { type: Number, required: true, default: 0 },
        firstShippedAt: { type: Date, required: true, default: () => new Date() },
        lastShippedAt: { type: Date, required: true, default: () => new Date() },
        shippers: { type: [String], required: true, default: () => [] },
        // Map<encodedSenderJid, action[]>. Each action recorded once per sender;
        // sender JIDs are URL-encoded before becoming Map keys (Mongo rejects
        // `.` in field names). The schema default supplies a fresh Map on
        // upsert; do NOT pass `contributions: {}` in $setOnInsert — that
        // mixes a plain object with a Map type and triggers Mongoose
        // coercion edge cases.
        contributions: { type: Map, of: [String], required: true, default: () => new Map() }
    },
    { minimize: false }
)

export default model<IBondModel>('bonds', BondSchema)
