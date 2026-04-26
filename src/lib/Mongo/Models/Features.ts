import { model, Schema } from 'mongoose'
import { IFeatureModel } from '../../../typings/index.js'

const FeatureSchema = new Schema({
    feature: { type: String, required: true, unique: true },
    state: {
        type: Boolean,
        required: false,
        default: true
    }
})

// change name
export default model<IFeatureModel>('feature', FeatureSchema)
