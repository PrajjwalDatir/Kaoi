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
    groqKey: string
    cerebrasKey: string
    geminiKey: string
    openrouterKey: string
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
    chatEnabled: boolean
    chatIdentity?: ICharacterDelta
}

export interface IUser {
    jid: string
    ban: boolean
    warnings: number
    Xp: number
    chatEnabled: boolean
    chatQuotaLimit: number
    chatQuotaUsed: number
    chatQuotaResetAt: Date
    chatIdentity?: ICharacterDelta
}

/** Character file shape — matches the eliza/character.json convention. The
 * baseline lives on disk (assets/json/kaoi-default.json) and is immutable from
 * runtime; per-chat drift is stored as a delta (see ICharacterDelta). */
export interface ICharacter {
    name: string
    bio: string[]
    lore: string[]
    topics: string[]
    adjectives: string[]
    style: { all: string[]; chat: string[]; post?: string[] }
    messageExamples: Array<Array<{ user: string; content: { text: string } }>>
    postExamples?: string[]
}

/** Per-chat append-only additions to the character. Only these three growable
 * fields can mutate at runtime; immutable parts (name/bio/adjectives/etc) live
 * only in the default character file. */
export interface ICharacterDelta {
    lore: string[]
    topics: string[]
    styleChat: string[]
}

/** What the model is allowed to emit as `identityAdd` in its JSON envelope. */
export interface IIdentityAdd {
    lore?: string[]
    topics?: string[]
    styleChat?: string[]
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
