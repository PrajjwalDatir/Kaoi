import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            adminOnly: true,
            command: 'groupchange',
            description: 'Updates the Group Subject or Description.',
            category: 'moderation',
            aliases: ['gadd', 'gset'],
            usage: `${client.config.prefix}gset (sub/desc) (value)`,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!M.groupMetadata) return void M.reply("This command can only be used in groups.")
        if (!this.client.isBotAdmin(M.groupMetadata))
            return void M.reply('Can not update without being an admin')
        // check if first parameter is subject or description
        if (M.args.length < 2) return void M.reply('You need to specify a subject and a value')
        const subject = M.args[1].toLowerCase()
        const value = M.args.slice(2).join(' ')
        if (subject === 'sub' || subject === 'subject') {
            await this.client
                .groupUpdateSubject(M.groupMetadata.id, value.toString())
                .then(() => {
                    return void M.reply('Group subject updated')
                })
                .catch((e) => {
                    console.error(e)
                    return void M.reply('Error updating subject')
                })
        } else if (subject === 'desc' || subject === 'description') {
            await this.client
                .groupUpdateDescription(M.groupMetadata.id, value.toString())
                .then(() => {
                    return void M.reply('Group description updated')
                })
                .catch((e) => {
                    console.log(e)
                    return void M.reply('Error while updating')
                })
        }
        return
    }
}
