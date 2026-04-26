import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'eval',
            description: 'Evaluates JavaScript ➕ ',
            category: 'dev',
            dm: true,
            usage: `${client.config.prefix}eval [JS CODE]`,
            modsOnly: true,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage, parsedArgs: IParsedArgs): Promise<void> => {
        let out: string
        try {
            const output = eval(parsedArgs.joined) || 'Executed JS Successfully!'
            console.log(output)
            out = JSON.stringify(output)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            out = err.message
        }
        return void (await M.reply(out))
    }
}
