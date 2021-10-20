import { MessageType } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import Jimp from 'jimp'
import {readFileSync} from 'fs'
import { image } from 'qr-image'
export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'jail',
            description: 'to send people to jail who are horny',
            category: 'fun',
            usage: `${client.config.prefix}jain [(as caption | quote)[image] | @mention]`,
            baseXp: 30
        })
    }

   
    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {

        const image = await (M.WAMessage?.message?.imageMessage
            ? this.client.downloadMediaMessage(M.WAMessage)
            : M.quoted?.message?.message?.imageMessage
            ? this.client.downloadMediaMessage(M.quoted.message)
            : M.mentioned[0]
            ? this.client.getProfilePicture(M.mentioned[0])
            : this.client.getProfilePicture(M.quoted?.sender || M.sender.jid))
            
        if (!image) return void M.reply(`Couldn't fetch the required Image`)

        const overly = readFileSync('../../../assets/images/jail.png');
        let watermark = await Jimp.read(overly);
        watermark = watermark.scaleToFit(1080,1180);
        const img = await Jimp.read(image);
        img.composite(watermark,0,0, {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacityDest: 100,
            opacitySource: 100,
          })
          const save = await img.getBuffer(Jimp.MIME_PNG,()=>{console.log('success')})
          const buffer = save.bitmap.data;
          



M.reply(buffer,MessageType.image)
    }
}
