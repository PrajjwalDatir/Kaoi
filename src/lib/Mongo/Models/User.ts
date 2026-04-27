import { Schema, model } from 'mongoose'
import { IUserModel } from '../../../typings/index.js'

const UserSchema = new Schema({
    jid: {
        type: String,
        required: true,
        unique: true
    },
    ban: {
        type: Boolean,
        required: true,
        default: false
    },
    warnings: {
        type: Number,
        required: true,
        default: 0
    },
    Xp: {
        type: Number,
        required: true,
        default: 0
    },
    chatEnabled: {
        type: Boolean,
        required: true,
        default: false
    },
    chatQuotaLimit: {
        type: Number,
        required: true,
        default: 20
    },
    chatQuotaUsed: {
        type: Number,
        required: true,
        default: 0
    },
    chatQuotaResetAt: {
        type: Date,
        required: true,
        default: () => new Date(0)
    }
})
export default model<IUserModel>('users', UserSchema)
