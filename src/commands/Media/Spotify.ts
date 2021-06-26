import { MessageType } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import request from '../../lib/request'
import Spotify from '../../lib/Spotify'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'spotify',
            description: 'Downloads given spotify track and sends it as Audio',
            category: 'media',
            usage: `${client.config.prefix}spotify [URL]`,
            dm: true,
            baseXp: 20,
            aliases: ['sp']
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!M.urls.length) return void M.reply(`Please provide the Spotify Track URL that you want to download`)
        const url = M.urls[0]
        const track = new Spotify(url)
        const info = await track.getInfo()
        if (info.error) return void M.reply(`Error Fetching: ${url}. Check if the url is valid and try again`)
        const caption = `🎧 *Title:* ${info.name || ''}\n🎤 *Artists:* ${(info.artists || []).join(',')}\n💽 *Album:* ${
            info.album_name
        }\n📆 *Release Date:* ${info.release_date || ''}`
        M.reply(
            await request.buffer(info?.cover_url as string),
            MessageType.image,
            undefined,
            undefined,
            caption
        ).catch(() => M.reply(caption))
        M.reply(await track.getAudio(), MessageType.audio)
    }
}
