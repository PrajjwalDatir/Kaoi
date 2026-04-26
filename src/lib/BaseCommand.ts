import MessageHandler from '../Handlers/MessageHandler.js'
import { ICommand, IParsedArgs, ISimplifiedMessage } from '../typings/index.js'
import WAClient from './WAClient.js'

export default class BaseCommand implements ICommand {
    constructor(public client: WAClient, public handler: MessageHandler, public config: ICommand['config']) {}

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    run = (M: ISimplifiedMessage, parsedArgs: IParsedArgs): Promise<void | never> | void | never => {
        throw new Error('run method should be defined')
    }
}
