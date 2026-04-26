import { MessageType } from '../../lib/types.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import request from '../../lib/request.js'
import Spotify from '../../lib/Spotify.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'spotify',
            description: 'Downloads given spotify track and sends it as Audio',
            category: 'media',
            usage: `${client.config.prefix}spotify [URL]`,
            baseXp: 20,
            aliases: ['sp']
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!M.urls.length) return void M.reply(`🔎 Provide the Spotify Track URL that you want to download`)
        const url = M.urls[0]
        const track = new Spotify(url)
        let info: Awaited<ReturnType<Spotify['getInfo']>>
        try {
            info = await track.getInfo()
        } catch {
            return void M.reply(`⚓ Error fetching: ${url}. Check if the URL is valid.`)
        }
        if (info.error) return void M.reply(`⚓ Error Fetching: ${url}. Check if the url is valid and try again`)

        const caption = `🎧 *Title:* ${info.name || ''}\n🎤 *Artists:* ${(info.artists || []).join(',')}\n💽 *Album:* ${
            info.album_name
        }\n📆 *Release Date:* ${info.release_date || ''}`

        if (info.cover_url) {
            try {
                const coverBuffer = await request.buffer(info.cover_url)
                await M.reply(coverBuffer, MessageType.image, undefined, undefined, caption)
            } catch (err) {
                await M.reply(`⚠ Couldn't fetch cover image: ${(err as Error).message}`)
            }
        } else {
            await M.reply(caption)
        }

        try {
            const audioBuffer = await track.getAudio()
            await M.reply(audioBuffer, MessageType.audio)
        } catch (err) {
            await M.reply(`❌ Couldn't download the audio: ${(err as Error).message}`)
        }
    }
}
