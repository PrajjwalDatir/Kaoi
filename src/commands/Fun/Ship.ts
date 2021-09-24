import { MessageType, Mimetype } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { exec } from 'child_process'
import { readFile, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { ISimplifiedMessage } from '../../typings'
import { promisify } from 'util'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'ship',
            description: 'Ship with the person you like.',
            category: 'fun',
            usage: `${client.config.prefix}ship [tag user]`
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
        const percentage = Math.floor(Math.random() * 100)
        let sentence
        if (percentage < 25) {
            sentence = `\t\t\t\t\t*ShipCent : ${percentage}%* \n\t\tWorse than average 😔`
        } else if (percentage < 50) {
            sentence = `\t\t\t\t\t*ShipCent : ${percentage}%* \n\t\tI don't know about this 😬`
        } else if (percentage < 75) {
            sentence = `\t\t\t\t\t*ShipCent : ${percentage}%* \n\t\t\tGood, I guess ⭐️`
        } else if (percentage < 90) {
            sentence = `\t\t\t\t\t*ShipCent : ${percentage}%* \nAmazing! You two will be a good couple 💖 `
        } else {
            sentence = `\t\t\t\t\t*ShipCent : ${percentage}%* \n\tYou two are fated to be together 💙`
        }

        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender)
        while (M.mentioned.length < 2) M.mentioned.push(M.sender.jid)
        const user1 = M.mentioned[0]
        const user2 = M.mentioned[1]
        const data = JSON.parse((this.client.assets.get('ship') as Buffer)?.toString()) as unknown as {
            shipJson: {
                id: number
                shipPercent: string
                gifLink: string
            }[]
        }

        const ship = data.shipJson.filter((ship) => {
            const shipPercent = parseInt(ship.shipPercent)
            return Math.abs(shipPercent - percentage) <= 10
        })
        // choose a random gif from the array
        const gifLink = ship[Math.floor(Math.random() * ship.length)].gifLink
        let caption = `\t❣️ *Matchmaking...* ❣️ \n`
        caption += `\t\t---------------------------------\n`
        caption += `@${user1.split('@')[0]}  x  @${user2.split('@')[0]}\n`
        caption += `\t\t---------------------------------\n`
        caption += `${sentence}`

        return void M.reply(
            await this.GIFBufferToVideoBuffer(await this.client.getBuffer(gifLink)),
            MessageType.video,
            Mimetype.gif,
            [user1, user2],
            caption
        )
    }
}
