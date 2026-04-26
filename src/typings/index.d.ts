import type { GroupMetadata } from 'baileys'

export * from './message.js'
export * from './command.js'
export * from './mongo.js'

export interface IConfig {
    name: string
    mods: string[]
    prefix: string
    session: string
    gkey: string
    chatBotUrl: string
}

export interface IParsedArgs {
    args: string[]
    flags: string[]
    joined: string
}

export interface IExtendedGroupMetadata extends GroupMetadata {
    admins?: string[]
}

export interface ISession {
    clientID: string
    serverToken: string
    clientToken: string
    encKey: string
    macKey: string
}

export interface IGroup {
    jid: string
    events: boolean
    nsfw: boolean
    safe: boolean
    mod: boolean
    cmd: boolean
    invitelink: boolean
}

export interface IUser {
    jid: string
    ban: boolean
    warnings: number
    Xp: number
}

export interface IFeature {
    feature: string
    state: boolean
}

export interface IPackage {
    description: string
    dependencies: { [key: string]: string }
    homepage: string
    repository: {
        url: string
    }
}

export interface IContactInfo {
    notify?: string
    name?: string
    vname?: string
    short?: string
}
