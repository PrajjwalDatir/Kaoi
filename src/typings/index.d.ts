import { WAGroupMetadata } from '@adiwajshing/baileys'

export * from './message'
export * from './command'
export * from './mongo'
export interface IConfig {
    name: string
    mods?: string[]
    prefix: string
    session: string
    mods: string[]
    gkey: string
    chatBotUrl: string
    gifApi: string
    weatherAppid: string
}

export interface IParsedArgs {
    args: string[]
    flags: string[]
    joined: string
}

export interface IExtendedGroupMetadata extends WAGroupMetadata {
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
