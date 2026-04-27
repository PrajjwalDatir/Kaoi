import { model, Schema } from 'mongoose'
import { IBondModel } from '../../../typings/index.js'

// Note on `_id`: Mongoose 8 will respect a declared `_id` field's type, but
// some upsert + cast paths still trip on a string `_id` unless we ALSO pass
// `{ _id: false }` in the schema options. With the option present, Mongoose
// stops trying to autogenerate an ObjectId — and our explicit
// `_id: { type: String }` field above takes over cleanly. Verified empirically
// to fix the silent runtime cast errors on findOneAndUpdate / find by string
// `_id` that the bond + rizz collections were exhibiting.
const BondSchema = new Schema(
    {
        // Canonical pipe-joined sorted JIDs. Computed by bondKey() in the Ship lib.
        _id: { type: String, required: true },
        members: { type: [String], required: true, index: true },
        size: { type: Number, required: true },
        // hash(_id) % 21 + 20. Immutable; cached to avoid recomputing on every read.
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
    { _id: false, minimize: false }
)

export default model<IBondModel>('bonds', BondSchema)
