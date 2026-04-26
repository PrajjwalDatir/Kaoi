import { MessageType } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'
import request from '../../lib/request.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'jail',
            description: 'Send a user (or yourself) to jail — overlays bars on the avatar',
            category: 'fun',
            usage: `${client.config.prefix}jail [(as caption | quote)[image] | @mention]`,
            baseXp: 30
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        // Resolve a target avatar URL. If the user attached or quoted an image,
        // we'd need to host it somewhere for the canvas API to fetch — popcat's
        // jail endpoint takes a public URL only. So we limit to profile pics
        // (which we can fetch a URL for) and skip user-uploaded buffers.
        const targetJid = M.mentioned[0] || M.quoted?.sender || M.sender.jid
        let avatarUrl: string | undefined
        try {
            avatarUrl = await this.client.sock.profilePictureUrl(targetJid, 'image')
        } catch {
            avatarUrl = undefined
        }
        if (!avatarUrl) {
            return void M.reply(
                `Couldn't fetch a profile picture to jail. Either the target has no public PFP or privacy settings block it.`
            )
        }

        try {
            const buffer = await request.buffer(
                `https://api.popcat.xyz/jail?image=${encodeURIComponent(avatarUrl)}`
            )
            await M.reply(buffer, MessageType.image, undefined, [targetJid], `🚓 To jail with you!`)
        } catch {
            await M.reply(`Sorry, couldn't generate the jail image right now.`)
        }
    }
}
