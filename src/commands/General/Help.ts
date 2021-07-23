import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ICommand, IParsedArgs, ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'help',
            description: 'Displays the help menu or shows the info of the command provided',
            category: 'general',
            usage: `${client.config.prefix}help (command_name)`,
            dm: true,
            aliases: ['h']
        })
    }

    run = async (M: ISimplifiedMessage, parsedArgs: IParsedArgs): Promise<void> => {
        if (!parsedArgs.joined) {
            const commands = this.handler.commands.keys()
            const categories: { [key: string]: ICommand[] } = {}
            for (const command of commands) {
                const info = this.handler.commands.get(command)
                if (!command) continue
                if (!info?.config?.category || info.config.category === 'dev') continue
                if (Object.keys(categories).includes(info.config.category)) categories[info.config.category].push(info)
                else {
                    categories[info.config.category] = []
                    categories[info.config.category].push(info)
                }
            }
         return `╭────┈ ↷
┃□│✎┊ *「✨Saber Pendragon✨」*
┃□│╭────────╯
┃□││❏OWNER   : *@Console.log("gen0s")*
┃□││❏OWNER # : *wa.me/919938533470*
┃□││❏NAME    : *${client._config.name}* 
┃□││❏PREFIX  : 「 ${client._config.prefix} 」
╰─────────────────┈ ❁ཻུ۪۪⸙͎	
─────────────────┈ ❁۪۪
❏ *👑Support-Owner👑* 」
─ ↷
> Follow Creator Repo  : https://github.com/AB1RZ9/Saber-Pendragon
> Official-Bot-Group   : 
╰─────────────────┈ ❁ཻུུ۪۪۪۪
─────────────────┈ ❁۪۪
❏ *📌General-Commands📌* 」
╰─❁۪۪
> *${client._config.prefix}help*
> *${client._config.prefix}xp*
> *${client._config.prefix}mods*
> *${client._config.prefix}everyone*
> *${client._config.prefix}profile*
> *${client._config.prefix}void*
> *${client._config.prefix}delete*
> *${client._config.prefix}profile*
> *${client._config.prefix}group*
> *${client._config.prefix}admins*
╰─────────────────┈ ❁ཻཻུུ۪۪۪۪⸙͎
─────────────────┈ ❁۪۪
❏ *🎬Media-Commands🎬* 」
╰─❁۪۪
> *${client._config.prefix}spotify*
> *${client._config.prefix}yts*
> *${client._config.prefix}yta*
> *${client._config.prefix}ytv*
> *${client._config.prefix}sticker*
> *${client._config.prefix}subred*
> *${client._config.prefix}blur*
╰─────────────────┈ ❁ཻུ۪۪⸙͎
─────────────────┈ ❁۪۪
❏ *👑Group-Admins👑* 」
╰─❁۪۪
> *${client._config.prefix}activate*
> *${client._config.prefix}deactivate*
> *${client._config.prefix}demote*
> *${client._config.prefix}promote*
> *${client._config.prefix}remove*
> *${client._config.prefix}deactivate*
> *${client._config.prefix}activate*
> *${client._config.prefix}purge*
> *${client._config.prefix}everyone*
╰─────────────────┈ ❁ཻཻུུ۪۪۪۪⸙͎
─────────────────┈ ❁۪۪
❏ *🎭Fun🎭* 」
╰─❁۪۪
> *${client._config.prefix}triggered*
> *${client._config.prefix}chess*
╰─────────────────┈ ❁ཻཻུུ۪۪۪۪⸙͎
─────────────────┈ ❁۪
┃□│✎┊ *「👾Saber Pendragon Bot- Kaoi's unofficial sister👾」*
┃□│╭────────╯   
┃□││❏*AB1RZ9*
╰─────────────────┈ ❁ཻུ۪۪⸙͎
║█║▌║█║▌│║▌║▌█║
║█║▌║█║▌│║▌║▌█║
--GULABI SUPREMACY--
\n📚 Use ${client._config.prefix}help <command_name> to view the full info. \n🔖 _Eg: ${client._config.prefix}help promote

Hope you have a great day! \n

🎩🐦✌....Peace`
         
        }
        const key = parsedArgs.joined.toLowerCase()
        const command = this.handler.commands.get(key) || this.handler.aliases.get(key)
        if (!command) return void M.reply(`No Command of Alias Found | "${key}"`)
        const state = await this.client.DB.disabledcommands.findOne({ command: command.config.command })
        M.reply(
            `🎫 *Command:* ${this.client.util.capitalize(command.config?.command)}\n🎗️ *Status:* ${
                state ? 'Disabled' : 'Available'
            }\n🀄 *Category:* ${this.client.util.capitalize(command.config?.category || '')}${
                command.config.aliases
                    ? `\n🍥 *Aliases:* ${command.config.aliases.map(this.client.util.capitalize).join(', ')}`
                    : ''
            }\n🃏 *Group Only:* ${this.client.util.capitalize(
                JSON.stringify(!command.config.dm ?? true)
            )}\n🎀 *Usage:* ${command.config?.usage || ''}\n\n🔖 *Description:* ${command.config?.description || ''}`
        )
    }

    emojis = ['🌀', '🎴', '🔮', '👑', '🎈', '⚙️', '🍀']
}
