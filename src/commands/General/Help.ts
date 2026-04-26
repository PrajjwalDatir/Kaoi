import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ICommand, IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'help',
            description: 'Displays the help menu or shows the info of the command provided',
            category: 'general',
            usage: `${client.config.prefix}help (command_name)`,
            aliases: ['h'],
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage, parsedArgs: IParsedArgs): Promise<void> => {
        if (!parsedArgs.joined) {
            const commands = this.handler.commands.keys()
            const categories: { [key: string]: ICommand[] } = {}
            for (const command of commands) {
                const info = this.handler.commands.get(command)
                if (!command) continue
                if (!info?.config?.category) continue
                if (Object.keys(categories).includes(info.config.category)) categories[info.config.category].push(info)
                else {
                    categories[info.config.category] = []
                    categories[info.config.category].push(info)
                }
            }
            let text = `👾 *Kaoi's Command List* 👾\n\n`
            const keys = Object.keys(categories).sort((a, b) => a.localeCompare(b))
            for (const key of keys)
                text += `${this.emojiFor(key)} *${this.client.util.capitalize(key)}*\n❐ \`\`\`${categories[
                    key
                ]
                    .map((command) => command.config?.command)
                    .join(', ')}\`\`\`\n\n`
            return void M.reply(
                `${text} 🗃️ *Note: Use ${this.client.config.prefix}help <command_name> to view the command info*`
            )
        }
        const key = parsedArgs.joined.toLowerCase()
        const command = this.handler.commands.get(key) || this.handler.aliases.get(key)
        if (!command) return void M.reply(`No Command of Alias Found | "${key}"`)
        const state = await this.client.DB.disabledcommands.findOne({ command: command.config.command })
        M.reply(
            `🎫 *Command:* ${this.client.util.capitalize(command.config?.command)}\n🎗️ *Status:* ${
                state ? 'Disabled' : 'Available'
            }\n🀄 *Category:* ${this.client.util.capitalize(command.config?.category || '')}${
                command.config.aliases && command.config.command !== 'react'
                    ? `\n🍥 *Aliases:* ${command.config.aliases.map(this.client.util.capitalize).join(', ')}`
                    : ''
            }\n🃏 *Group Only:* ${this.client.util.capitalize(
                JSON.stringify(!command.config.dm)
            )}\n🎀 *Usage:* ${command.config?.usage || ''}\n\n🔖 *Description:* ${command.config?.description || ''}`
        )
    }

    /** Stable emoji per category — adding/removing categories doesn't shift others. */
    private categoryEmojis: { [key: string]: string } = {
        anime: '📺',
        bots: '🤖',
        config: '⚙️',
        dev: '👨‍💻',
        educative: '📚',
        fun: '👻',
        games: '🎲',
        general: '😶‍🌫️',
        media: '📼',
        moderation: '🦉',
        category: '🪜'
    }
    private emojiFor = (key: string): string => this.categoryEmojis[key] || '🔹'
}
