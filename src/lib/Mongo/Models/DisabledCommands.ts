import { model, Schema } from 'mongoose'
import { IDisabledCommandModel } from '../../../typings'

const DisabledCommandSchema = new Schema({
    command: {
        type: String,
        unique: true,
        required: true
    },
    reason: {
        type: String,
        required: false
    }
})

export default model<IDisabledCommandModel>('disabledcommands', DisabledCommandSchema)
