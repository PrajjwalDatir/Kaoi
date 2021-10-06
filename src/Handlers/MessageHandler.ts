import axios from 'axios'
import chalk from 'chalk'
import { join } from 'path'
import BaseCommand from '../lib/BaseCommand'
import WAClient from '../lib/WAClient'
import { ICommand, IParsedArgs, ISimplifiedMessage } from '../typings'

export default class MessageHandler {
    commands = new Map<string, ICommand>()
    aliases = new Map<string, ICommand>()
    constructor(public client: WAClient) {}

    handleMessage = async (M: ISimplifiedMessage): Promise<void> => {
        if (!(M.chat === 'dm') && M.WAMessage.key.fromMe && M.WAMessage.status.toString() === '2') {
            /*
            BUG : It receives message 2 times and processes it twice.
            https://github.com/adiwajshing/Baileys/blob/8ce486d/WAMessage/WAMessage.d.ts#L18529
            https://adiwajshing.github.io/Baileys/enums/proto.webmessageinfo.webmessageinfostatus.html#server_ack
            */
            M.sender.jid = this.client.user.jid
            M.sender.username = this.client.user.name || this.client.user.vname || this.client.user.short || 'Kaoi Bot'
        } else if (M.WAMessage.key.fromMe) return void null

        if (M.from.includes('status')) return void null
        const { args, groupMetadata, sender } = M
        if (M.chat === 'dm') {
            if (this.client.config.chatBotUrl) {
                const myUrl = new URL(this.client.config.chatBotUrl)
                const params = myUrl.searchParams
                await axios
                    .get(
                        `${encodeURI(
                            `http://api.brainshop.ai/get?bid=${params.get('bid')}&key=${params.get('key')}&uid=${
                                M.sender.jid
                            }&msg=${M.args}`
                        )}`
                    )
                    .then((res) => {
                        if (res.status !== 200) return void M.reply(`🔍 Error: ${res.status}`)
                        return void M.reply(res.data.cnt)
                    })
                    .catch(() => {
                        M.reply(`Ummmmmmmmm.`)
                    })
            }
        }

        if (!M.groupMetadata && !(M.chat === 'dm')) return void null

        if ((await this.client.getGroupData(M.from)).mod && M.groupMetadata?.admins?.includes(this.client.user.jid))
            this.moderate(M)
        if (!args[0] || !args[0].startsWith(this.client.config.prefix))
            return void this.client.log(
                `${chalk.blueBright('MSG')} from ${chalk.green(sender.username)} in ${chalk.cyanBright(
                    groupMetadata?.subject || ''
                )}`
            )
        const cmd = args[0].slice(this.client.config.prefix.length).toLowerCase()
        const command = this.commands.get(cmd) || this.aliases.get(cmd)
        this.client.log(
            `${chalk.green('CMD')} ${chalk.yellow(`${args[0]}[${args.length - 1}]`)} from ${chalk.green(
                sender.username
            )} in ${chalk.cyanBright(groupMetadata?.subject || 'DM')}`
        )
        if (!command) return void M.reply('No Command Found! Try using one from the help list.')
        const user = await this.client.getUser(M.sender.jid)
        if (user.ban) return void M.reply("You're Banned from using commands.")
        const state = await this.client.DB.disabledcommands.findOne({ command: command.config.command })
        if (state) return void M.reply(`❌ This command is disabled${state.reason ? ` for ${state.reason}` : ''}`)
        if (!command.config?.dm && M.chat === 'dm') return void M.reply('This command can only be used in groups')
        if (command.config?.adminOnly && !M.sender.isAdmin)
            return void M.reply(`Only admins are allowed to use this command`)
        try {
            await command.run(M, this.parseArgs(args))
            if (command.config.baseXp) {
                await this.client.setXp(M.sender.jid, command.config.baseXp || 10, 50)
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err :any) {
            return void this.client.log(err.message, true)
        }
    }

    moderate = async (M: ISimplifiedMessage): Promise<void> => {
        if (M.sender.isAdmin) return void null
        if (M.urls.length) {
            const groupinvites = M.urls.filter((url) => url.includes('chat.whatsapp.com'))
            if (groupinvites.length) {
                groupinvites.forEach(async (invite) => {
                    const splitInvite = invite.split('/')
                    const z = await this.client.groupInviteCode(M.from)
                    if (z !== splitInvite[splitInvite.length - 1]) {
                        this.client.log(
                            `${chalk.blueBright('MOD')} ${chalk.green('Group Invite')} by ${chalk.yellow(
                                M.sender.username
                            )} in ${M.groupMetadata?.subject || ''}`
                        )
                        return void (await this.client.groupRemove(M.from, [M.sender.jid]))
                    }
                })
            }
        }
    }

    loadCommands = (): void => {
        this.client.log(chalk.green('Loading Commands...'))
        const path = join(__dirname, '..', 'commands')
        const files = this.client.util.readdirRecursive(path)
        files.map((file) => {
            const filename = file.split('/')
            if (!filename[filename.length - 1].startsWith('_')) {
                //eslint-disable-next-line @typescript-eslint/no-var-requires
                const command: BaseCommand = new (require(file).default)(this.client, this)
                this.commands.set(command.config.command, command)
                if (command.config.aliases) command.config.aliases.forEach((alias) => this.aliases.set(alias, command))
                this.client.log(`Loaded: ${chalk.green(command.config.command)} from ${chalk.green(file)}`)
                return command
            }
        })
        this.client.log(`Successfully Loaded ${chalk.greenBright(this.commands.size)} Commands`)
    }

    parseArgs = (args: string[]): IParsedArgs => {
        const slicedArgs = args.slice(1)
        return {
            args: slicedArgs,
            flags: slicedArgs.filter((arg) => arg.startsWith('--')),
            joined: slicedArgs.join(' ').trim()
        }
    }
}
