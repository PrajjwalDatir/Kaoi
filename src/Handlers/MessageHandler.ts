import axios from 'axios'
import chalk from 'chalk'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import BaseCommand from '../lib/BaseCommand.js'
import WAClient from '../lib/WAClient.js'
import { ICommand, IParsedArgs, ISimplifiedMessage } from '../typings/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default class MessageHandler {
    commands = new Map<string, ICommand>()
    aliases = new Map<string, ICommand>()
    constructor(public client: WAClient) {}

    handleMessage = async (M: ISimplifiedMessage): Promise<void> => {
        const status = (M.WAMessage.status as unknown as number | string | undefined)?.toString()
        if (!(M.chat === 'dm') && M.WAMessage.key?.fromMe && status === '2') {
            M.sender.jid = this.client.user.jid
            M.sender.username =
                this.client.user.name || this.client.user.vname || this.client.user.short || 'Kaoi Bot'
        } else if (M.WAMessage.key?.fromMe) return void null

        if (M.from.includes('status')) return void null
        const { args, groupMetadata, sender } = M
        if (M.chat === 'dm' && this.client.isFeature('chatbot')) {
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
        const allowedCommands = ['activate', 'deactivate', 'act', 'deact']
        if (!(allowedCommands.includes(cmd) || (await this.client.getGroupData(M.from)).cmd))
            return void this.client.log(
                `${chalk.green('CMD')} ${chalk.yellow(`${args[0]}[${args.length - 1}]`)} from ${chalk.green(
                    sender.username
                )} in ${chalk.cyanBright(groupMetadata?.subject || 'DM')}`
            )
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
        if (command.config?.modsOnly && !this.client.config.mods?.includes(M.sender.jid)) {
            return void M.reply(`Only MODS are allowed to use this command`)
        }
        if (command.config?.adminOnly && !M.sender.isAdmin)
            return void M.reply(`Only admins are allowed to use this command`)
        try {
            await command.run(M, this.parseArgs(args))
            if (command.config.baseXp) {
                await this.client.setXp(M.sender.jid, command.config.baseXp || 10, 50)
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err)
            return void this.client.log(message, true)
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

    loadCommands = async (): Promise<void> => {
        this.client.log(chalk.green('Loading Commands...'))
        const path = join(__dirname, '..', 'commands')
        const files = this.client.util.readdirRecursive(path)
        for (const file of files) {
            const filename = file.split(/[\\/]/)
            if (filename[filename.length - 1].startsWith('_')) continue
            if (!file.endsWith('.js') && !file.endsWith('.ts')) continue
            const mod = await import(pathToFileURL(file).href)
            const Cmd = mod.default
            const command: BaseCommand = new Cmd(this.client, this)
            this.commands.set(command.config.command, command)
            if (command.config.aliases)
                command.config.aliases.forEach((alias) => this.aliases.set(alias, command))
            this.client.log(`Loaded: ${chalk.green(command.config.command)} from ${chalk.green(file)}`)
        }
        this.client.log(`Successfully Loaded ${chalk.greenBright(this.commands.size)} Commands`)
    }

    loadFeatures = (): void => {
        this.client.log(chalk.green('Loading Features...'))
        this.client.setFeatures().then(() => {
            this.client.log(`Successfully Loaded ${chalk.greenBright(this.client.features.size)} Features`)
        })
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
