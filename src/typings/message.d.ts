import type { WAMessage } from 'baileys'
import type { MessageType, Mimetype } from '../lib/types.js'
import type { IExtendedGroupMetadata } from './index.js'

export type { WAMessage }

export interface ISimplifiedMessage {
    type: MessageType | string
    content: string | null
    args: string[]
    reply(
        content: string | Buffer,
        type?: MessageType | string,
        mime?: Mimetype | string,
        mention?: string[],
        caption?: string,
        thumbnail?: Buffer
    ): Promise<unknown>
    mentioned: string[]
    groupMetadata: IExtendedGroupMetadata | null
    chat: 'group' | 'dm'
    from: string
    sender: {
        jid: string
        username: string
        isAdmin: boolean
    }
    quoted?: {
        message?: WAMessage | null
        sender?: string | null
    } | null
    WAMessage: WAMessage
    urls: string[]
}
