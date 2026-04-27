import { model, Schema } from 'mongoose'
import { IUserRizzModel } from '../../../typings/index.js'

const UserRizzSchema = new Schema({
    // _id is the user's normalized JID. Declaring it as String overrides
    // Mongoose's default ObjectId.
    _id: { type: String, required: true },
    // hash('rizz:' + jid) % 30 + 20. Immutable.
    baseRizz: { type: Number, required: true },
    // Distinct outsiders (≠ user) who have shipped this user with anyone.
    outsiderShippers: { type: [String], required: true, default: () => [] }
})

export default model<IUserRizzModel>('userrizz', UserRizzSchema)
