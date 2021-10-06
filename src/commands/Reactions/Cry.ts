import { MessageType, Mimetype } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'cry',
            description: 'Crying makes you cry',
            category: 'reactions',
            usage: `${client.config.prefix}cry [tag/quote users]`
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        if (!M.mentioned.length) M.mentioned.push(M.sender.jid)
        let noun = 'with'
        if (M.mentioned[0] === M.sender.jid) noun = 'by'

        // if M.mentioned is empty, then assign noun to 'by' else assign noun to 'with'
        M.reply(
            await this.client.util.GIFBufferToVideoBuffer(
                await this.client.getBuffer(
                    (
                        await this.client.fetch<{ url: string }>(`https://api.waifu.pics/sfw/cry`)
                    ).url
                )
            ),
            MessageType.video,
            Mimetype.gif,
            [M.sender.jid, ...M.mentioned],
            `*@${M.sender.jid.split('@')[0]} is Crying ${noun} ${M.mentioned
                .map((user) => (user === M.sender.jid ? 'Themselves' : `@${user.split('@')[0]}`))
                .join(', ')}*`
        )
    }
}
