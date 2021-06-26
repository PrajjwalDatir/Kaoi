import MessageHandler from '../Handlers/MessageHandler'
import { WAClient } from '../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from './'

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
    }
}

export type TCategory = 'general' | 'moderation' | 'misc' | 'media' | 'utils' | 'dev' | 'category' | 'fun'
