import { MessageType, Mimetype } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import { tmpdir } from 'os'
import { exec } from 'child_process'
import { readFile, unlink, writeFile } from 'fs/promises'
import { promisify } from 'util'


export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'reaction',
            description: 'Reactions',
            category: 'fun',
            usage: `${client.config.prefix}reaction [reaction] [Tag/qoute]`,
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
    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void M.reply('Give me a reaction, Baka!')
        const chitoge = joined.trim()
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        if (!M.mentioned.length) M.mentioned.push(M.sender.jid)
        M.reply(
            await this.GIFBufferToVideoBuffer(
                await this.client.getBuffer(
                    (
                        await this.client.fetch<{ url: string }>(
                            `https://api.waifu.pics/sfw/${chitoge}`
                        )
                    ).url
                )
            ),
            MessageType.video,
            Mimetype.gif,
            [M.sender.jid, ...M.mentioned],
            `*@${M.sender.jid.split('@')[0]} did a reaction of ${chitoge} at ${M.mentioned
                .map((user) => (user === M.sender.jid ? 'Themselves' : `@${user.split('@')[0]}`))
                .join(', ')}*`
        )
    }
}
