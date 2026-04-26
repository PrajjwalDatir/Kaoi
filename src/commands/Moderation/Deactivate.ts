import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient, { toggleableGroupActions } from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            adminOnly: true,
            command: 'deactivate',
            aliases: ['deact'],
            description: 'deactivate certain features on group-chats',
            category: 'moderation',
            usage: `${client.config.prefix}deactivate [events | mod | safe | nsfw | cmd | invitelink]`,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        const type = joined.trim().toLowerCase() as toggleableGroupActions
        if (!Object.values(toggleableGroupActions).includes(type))
            return void M.reply(`🟥 Invalid Option: *${this.client.util.capitalize(type)}*`)
        const data = await this.client.getGroupData(M.from)
        if (!data[type]) return void M.reply(`🟨 *${this.client.util.capitalize(type)}* is already *inactive*`)
        await this.client.DB.group.updateOne({ jid: M.from }, { $set: { [type]: false } })
        return void M.reply(`🟩 *${this.client.util.capitalize(type)}* is now inactive`)
    }
}
