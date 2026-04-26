import MessageHandler from '../Handlers/MessageHandler.js'
import WAClient from '../lib/WAClient.js'
import type { IParsedArgs, ISimplifiedMessage } from './index.js'

export interface ICommand {
    client?: WAClient
    handler?: MessageHandler
    run(M: ISimplifiedMessage, parsedArgs: IParsedArgs): Promise<void | never> | void | never
    config: {
        adminOnly?: boolean
        aliases?: string[]
        description?: string
        command: string
        id?: string
        category?: TCategory
        usage?: string
        dm?: boolean
        baseXp?: number
        modsOnly?: boolean
    }
}

export type TCategory =
    | 'anime'
    | 'bots'
    | 'config'
    | 'dev'
    | 'fun'
    | 'games'
    | 'educative'
    | 'general'
    | 'media'
    | 'moderation'
    | 'category'
