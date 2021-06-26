import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'eval',
            description: 'Evaluates JavaScript ➕ ',
            category: 'dev',
            usage: `${client.config.prefix}eval [JS CODE]`
        })
    }

    run = async (M: ISimplifiedMessage, parsedArgs: IParsedArgs): Promise<void> => {
        if (!this.client.config.mods?.includes(M.sender.jid)) return void null
        let out: string
        try {
            const output = eval(parsedArgs.joined) || 'Executed JS Successfully!'
            console.log(output)
            out = JSON.stringify(output)
        } catch (err) {
            out = err.message
        }
        return void (await M.reply(out))
    }
}
