import { Document, Model } from 'mongoose'
import { IFeature, IGroup, IUser } from './'

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

export interface IDBModels {
    user: Model<IUserModel>
    group: Model<IGroupModel>
    session: Model<ISessionModel>
    feature: Model<IFeatureModel>
}
