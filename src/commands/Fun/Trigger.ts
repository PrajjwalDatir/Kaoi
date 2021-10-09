import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'
import Canvas from 'canvas'
import GIFEncoder from 'gifencoder'
import { Sticker } from 'wa-sticker-formatter'
import { MessageType, Mimetype } from '@adiwajshing/baileys'
// import { MessageType, Mimetype } from '@adiwajshing/baileys'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'trigger',
            description: 'Sends the triggered version of you',
            category: 'fun',
            usage: `${client.config.prefix}trigger [tag/caption image | @mention]`,
            baseXp: 10
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        const getImage = async (image: string | Buffer, timeout = 15) => {
            const img = await Canvas.loadImage(image)
            const GIF = new GIFEncoder(256, 310)
            GIF.start()
            GIF.setRepeat(0)
            GIF.setDelay(timeout)
            const canvas = Canvas.createCanvas(256, 310)
            const ctx = canvas.getContext(`2d`)
            const BR = 20
            const LR = 10
            for (let i = 0; i < 9; i++) {
                ctx.clearRect(0, 0, 256, 310)
                ctx.drawImage(
                    img,
                    Math.floor(Math.random() * BR) - BR,
                    Math.floor(Math.random() * BR) - BR,
                    256 + BR,
                    310 - 54 + BR
                )
                ctx.fillStyle = `#FF000033`
                ctx.fillRect(0, 0, 256, 310)
                ctx.drawImage(
                    await Canvas.loadImage(this.client.assets.get('triggered') || Buffer.from('')),
                    Math.floor(Math.random() * LR) - LR,
                    310 - 54 + Math.floor(Math.random() * LR) - LR,
                    256 + LR,
                    54 + LR
                )
                GIF.addFrame(ctx)
            }
            GIF.finish()
            return GIF.out.getData()
        }
        try {
            const image = await (M.WAMessage?.message?.imageMessage
                ? this.client.downloadMediaMessage(M.WAMessage)
                : M.quoted?.message?.message?.imageMessage
                ? this.client.downloadMediaMessage(M.quoted.message)
                : M.quoted?.sender
                ? this.client.getProfilePicture(M.quoted.sender)
                : M.mentioned
                ? this.client.getProfilePicture(M.mentioned[0])
                : this.client.getProfilePicture(M.sender.jid))
            const sticker = new Sticker(await getImage(image), {
                pack: `Triggered`,
                author: M.sender.username || `Kaoi`,
                type: 'full',
                categories: ['💢']
            })
            if (!sticker) return void M.reply(`I couldn't find an image to trigger.`)
            return void (await M.reply(await sticker.build(), MessageType.sticker, Mimetype.webp))
        } catch (err) {
            console.log(err)
            M.reply(`Couldn't fetch the required Image.\n*Error* : ${err}`)
        }
    }
}
