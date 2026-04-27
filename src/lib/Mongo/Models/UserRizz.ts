import { model, Schema } from 'mongoose'
import { IUserRizzModel } from '../../../typings/index.js'

// See note in Bond.ts on why `{ _id: false }` matters even when `_id` is
// declared explicitly — it stops Mongoose from autogenerating an ObjectId
// alongside our string id, which silently broke string-id upserts.
const UserRizzSchema = new Schema(
    {
        // _id is the user's normalized JID.
        _id: { type: String, required: true },
        // hash('rizz:' + jid) % 21 + 20. Immutable.
        baseRizz: { type: Number, required: true },
        // Distinct outsiders (≠ user) who have shipped this user with anyone.
        outsiderShippers: { type: [String], required: true, default: () => [] }
    },
    { _id: false }
)

export default model<IUserRizzModel>('userrizz', UserRizzSchema)
