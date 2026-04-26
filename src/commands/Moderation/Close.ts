import { GroupSettingChange } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            adminOnly: true,
            command: 'close',
            description: 'Close the group for all participants. Only Admins can message',
            category: 'moderation',
            usage: `${client.config.prefix}close`,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!M.groupMetadata?.admins?.includes(this.client.user.jid))
            return void M.reply("I can't close the group without being an admin")
        if (M.groupMetadata.announce === true) return void M.reply('Group is already closed')
        this.client.groupSettingChange(M.groupMetadata.id, GroupSettingChange.messageSend, true)
        return
    }
}
