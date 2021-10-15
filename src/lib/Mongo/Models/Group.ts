import { model, Schema } from 'mongoose'
import { IGroupModel } from '../../../typings'

const GroupSchema = new Schema({
    // This is the id of the group
    jid: {
        type: String,
        required: true,
        unique: true
    },
    // whether to enable the events for this group. Events are 'add' 'remove' events.
    events: {
        type: Boolean,
        required: false,
        default: false
    },
    // whether to allow nsfw commands for this group.
    nsfw: {
        type: Boolean,
        required: false,
        default: false
    },
    // TODO: NSFW checker.
    safe: {
        type: Boolean,
        required: false,
        default: false
    },
    // Remove people who post group links.
    mod: {
        type: Boolean,
        required: false,
        default: false
    },
    // Are commands enabled for this group.
    cmd: {
        type: Boolean,
        required: false,
        default: true
    },
    // Can people ask for Invite link of this group?
    invitelink: {
        type: Boolean,
        required: false,
        default: false
    }
})

export default model<IGroupModel>('groups', GroupSchema)
