import { IDBModels } from '../typings/index.js'
import UserModel from '../lib/Mongo/Models/User.js'
import GroupModel from '../lib/Mongo/Models/Group.js'
import SessionModel from '../lib/Mongo/Models/Session.js'
import DisabledCommandsModel from '../lib/Mongo/Models/DisabledCommands.js'
import IFeatureModel from '../lib/Mongo/Models/Features.js'

export default class DatabaseHandler implements IDBModels {
    user = UserModel
    group = GroupModel
    session = SessionModel
    disabledcommands = DisabledCommandsModel
    feature = IFeatureModel
}
