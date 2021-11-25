import { MessageType, Mimetype } from '@adiwajshing/baileys'
import { Sticker, Categories, StickerTypes } from 'wa-sticker-formatter'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import fs from 'fs';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
export default class Command extends BaseCommand {
    exe() {
        throw new Error('Method not implemented.')
    }
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'steal',
            aliases: ['chori'],
            description: 'steals the sticker for you',
            category: 'media',
            usage: `${client.config.prefix}sticker [(as caption | tag)[sticker]]`,
            baseXp: 30
        })
    }
    
    run = async (M: ISimplifiedMessage, parsedArgs: IParsedArgs): Promise<void> => {
        let buffer
 const pack = parsedArgs.joined.split('|');
 if (M.quoted?.message?.message?.stickerMessage) buffer = await this.client.downloadMediaMessage(M.quoted.message)
        if (!buffer) return void M.reply(`You didn't provide any sticker to convert`)
        const filename = `${tmpdir()}/${Math.random().toString(36)}`
        const sticker:any = await  new Sticker(buffer, {
            pack: pack[1] || '👾 For You ', 
            author: pack[2] || 'By Monarch+Kaoi 👾', 
            quality: 50 
        }).build();
          fs.writeFileSync(`${filename}.webp`,sticker);
        const stickerbuffer =  fs.readFileSync(`${filename}.webp`)
                 await M.reply(stickerbuffer, MessageType.sticker, Mimetype.webp)
    }
}
