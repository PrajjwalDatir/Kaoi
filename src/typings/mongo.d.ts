import type { Document, Model } from 'mongoose'
import type { IBond, IFeature, IGroup, ISession, IUser, IUserRizz } from './index.js'

export interface IGroupModel extends IGroup, Document {}

export interface IUserModel extends IUser, Document {}

export interface IDisabledCommandModel extends Document {
    command: string
    reason: string
}

export interface IFeatureModel extends IFeature, Document {}

export interface ISessionModel extends Document {
    ID: string
    session: ISession
}

// _id is a string for these models, so we Omit to avoid colliding with
// Document's ObjectId-flavored _id.
export interface IBondModel extends Omit<IBond, never>, Omit<Document, '_id'> {}

export interface IUserRizzModel extends Omit<IUserRizz, never>, Omit<Document, '_id'> {}

export interface IDBModels {
    user: Model<IUserModel>
    group: Model<IGroupModel>
    session: Model<ISessionModel>
    feature: Model<IFeatureModel>
    bond: Model<IBondModel>
    rizz: Model<IUserRizzModel>
}
