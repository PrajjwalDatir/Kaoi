import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'enable',
            description: 'Enables the given command globally',
            category: 'config',
            dm: true,
            usage: `${client.config.prefix}enable [command]`,
            modsOnly: true,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        const key = joined.toLowerCase().trim()
        if (!key) return void (await M.reply(`Provide the command you want to enable`))
        const feature = key === 'chatbot' ? key : ''
        const command = this.handler.commands.get(key) || this.handler.aliases.get(key)
        if (feature) {
            const data = await this.client.getFeatures(feature)
            if (data.state) return void M.reply(`🟨 *${this.client.util.capitalize(feature)}* is already *active*`)
            await this.client.DB.feature.updateOne({ feature: feature }, { $set: { state: true } }).catch(() => {
                return void M.reply(`🟨 *${this.client.util.capitalize(feature)}* failed to enable`)
            })
            this.client.features.set('chatbot', true)
            return void M.reply(`🟩 *${this.client.util.capitalize(feature)}* is now active`)
        }
        if (!command) return void (await M.reply(`No command found`))
        if (!(await this.client.DB.disabledcommands.findOne({ command: command.config.command })))
            return void M.reply(`${this.client.util.capitalize(command.config.command)} is already enabled`)
        await this.client.DB.disabledcommands.deleteOne({ command: command.config.command })
        await M.reply(`*${this.client.util.capitalize(command.config.command)}* is now Enabled`)
    }
}
