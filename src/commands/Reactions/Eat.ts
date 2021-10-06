import { MessageType, Mimetype } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'eat',
            description: 'Eat Someone/Something',
            category: 'reactions',
            usage: `${client.config.prefix}eat`
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        if (!M.mentioned.length) M.mentioned.push(M.sender.jid)
        M.reply(
            await this.client.util.GIFBufferToVideoBuffer(
                await this.client.getBuffer(
                    (
                        await this.client.fetch<{ url: string }>(`https://api.waifu.pics/sfw/nom`)
                    ).url
                )
            ),
            MessageType.video,
            Mimetype.gif,
            [M.sender.jid, ...M.mentioned],
            `*@${M.sender.jid.split('@')[0]} is eating ${M.mentioned
                .map((user) => (user === M.sender.jid ? 'Themselves' : `@${user.split('@')[0]}`))
                .join(', ')}*`
        )
    }
}
