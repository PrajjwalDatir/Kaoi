import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'disable',
            description: 'Disables the given command from being used',
            category: 'dev',
            usage: `${client.config.prefix}disable [command] | (reason)`
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!this.client.config.mods?.includes(M.sender.jid)) return void null
        const split = joined.split('|')
        const key = split[0].toLowerCase().trim()
        if (!key) return void (await M.reply(`Provide the command you want to disable`))
        const command = this.handler.commands.get(key) || this.handler.aliases.get(key)
        if (!command) return void (await M.reply(`No command found`))
        if (await this.client.DB.disabledcommands.findOne({ command: command.config.command }))
            return void M.reply(`${command.config.command} is already disabled`)
        await new this.client.DB.disabledcommands({
            command: command.config.command,
            reason: (split[1] || '').trim() || ''
        }).save()
        await M.reply(
            `*${this.client.util.capitalize(command.config.command)}* is now Disabled${
                split[1] ? ` for ${split[1]}` : ''
            }`
        )
    }
}
