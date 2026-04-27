import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'

const EXTEND_BY = 20

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'quota',
            description:
                'Mod-only: set or extend a user\'s daily chat quota. ' +
                '`!quota @user <n>` or `!quota <n>` (DM); `!quota extend [@user]`.',
            category: 'bots',
            dm: true,
            usage:
                `${client.config.prefix}quota @user 50 (group)  |  ` +
                `${client.config.prefix}quota 50 (DM)  |  ` +
                `${client.config.prefix}quota extend [@user]`,
            modsOnly: true,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage, { args }: IParsedArgs): Promise<void> => {
        const first = (args[0] || '').toLowerCase()

        // !quota extend [@user]
        if (first === 'extend') {
            const target = this.resolveTarget(M)
            if (!target)
                return void M.reply(
                    M.chat === 'group'
                        ? `Tag the user to extend. Example: ${this.client.config.prefix}quota extend @user`
                        : `Run this in a DM with the user, or in a group with ${this.client.config.prefix}quota extend @user.`
                )
            await this.client.extendChatQuota(target, EXTEND_BY)
            return void M.reply(
                `Topped up @${target.split('@')[0]} by ${EXTEND_BY} messages for today.`,
                undefined,
                undefined,
                [target]
            )
        }

        // !quota <n>          (DM, sets the DM partner's limit)
        // !quota @user <n>    (group, sets the tagged user's limit)
        if (M.chat === 'group') {
            if (!M.mentioned.length)
                return void M.reply(
                    `Tag the user. Example: ${this.client.config.prefix}quota @user 50`
                )
            const target = M.mentioned[0]
            const n = this.parseLimit(args)
            if (n === null)
                return void M.reply(
                    `Provide a number. Example: ${this.client.config.prefix}quota @user 50`
                )
            await this.client.setChatQuotaLimit(target, n)
            return void M.reply(
                `Set @${target.split('@')[0]}'s daily chat quota to ${n}.`,
                undefined,
                undefined,
                [target]
            )
        }

        // DM
        const n = this.parseLimit(args)
        if (n === null)
            return void M.reply(
                `Provide a number. Example: ${this.client.config.prefix}quota 50`
            )
        await this.client.setChatQuotaLimit(M.sender.jid, n)
        return void M.reply(`Set your daily chat quota to ${n}.`)
    }

    private resolveTarget = (M: ISimplifiedMessage): string | null => {
        if (M.mentioned.length) return M.mentioned[0]
        if (M.chat === 'dm') return M.sender.jid
        return null
    }

    private parseLimit = (args: string[]): number | null => {
        for (const a of args) {
            const n = Number(a)
            if (Number.isFinite(n) && n >= 0) return Math.floor(n)
        }
        return null
    }
}
