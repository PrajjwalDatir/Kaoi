import { MessageType, Mimetype } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { readFile, unlink, writeFile } from 'fs/promises'
import { promisify } from 'util'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'smug',
            description: 'Smug at someone',
            category: 'reactions',
            usage: `${client.config.prefix}smug [tag/quote users]`
        })
    }
    exec = promisify(exec)

    GIFBufferToVideoBuffer = async (image: Buffer): Promise<Buffer> => {
        const filename = `${tmpdir()}/${Math.random().toString(36)}`
        await writeFile(`${filename}.gif`, image)
        await this.exec(
            `ffmpeg -f gif -i ${filename}.gif -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${filename}.mp4`
        )
        const buffer = await readFile(`${filename}.mp4`)
        Promise.all([unlink(`${filename}.mp4`), unlink(`${filename}.gif`)])
        return buffer
    }
    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        if (!M.mentioned.length) M.mentioned.push(M.sender.jid)
        M.reply(
            await this.GIFBufferToVideoBuffer(
                await this.client.getBuffer(
                    (
                        await this.client.fetch<{ url: string }>(`https://api.waifu.pics/sfw/smug`)
                    ).url
                )
            ),
            MessageType.video,
            Mimetype.gif,
            [M.sender.jid, ...M.mentioned],
            `*@${M.sender.jid.split('@')[0]} is Smug at ${M.mentioned
                .map((user) => (user === M.sender.jid ? 'Themselves' : `@${user.split('@')[0]}`))
                .join(', ')}*`
        )
    }
}
