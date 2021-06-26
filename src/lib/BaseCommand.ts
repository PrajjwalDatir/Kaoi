import MessageHandler from '../Handlers/MessageHandler'
import { ICommand, IParsedArgs, ISimplifiedMessage } from '../typings'
import WAClient from './WAClient'

export default class BaseCommand implements ICommand {
    constructor(public client: WAClient, public handler: MessageHandler, public config: ICommand['config']) {}

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    run = (M: ISimplifiedMessage, parsedArgs: IParsedArgs): Promise<void | never> | void | never => {
        throw new Error('run method should be defined')
    }
}
