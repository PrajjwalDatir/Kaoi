import { MessageType, Mimetype } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import request from '../../lib/request'
import WAClient from '../../lib/WAClient'
import { ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'hug',
            description: 'Hug someone!!',
            category: 'fun',
            usage: `${client.config.prefix}hug @whom_you_wanna_hug`,
            
        })
    }
    run = async (M: ISimplifiedMessage): Promise<void> => {

        const user1 = M.sender.jid
        const user2 = M.mentioned[0]
//  let username1 = user1.split('@')[0]
//  let username2 = user2.split('@')[0]
// let username1 = user1.replace('@s.whatsapp.net', '')
// let username2 = user2.replace('@s.whatsapp.net', '')
const n = ['./assets/videos/hug/hug.mp4','./assets/videos/hug/hug4.mp4','./assets/videos/hug/hug3.mp4','./assets/videos/hug/hug2.mp4','./assets/videos/hug/hug1.mp4']
let hug = n[Math.floor(Math.random() * n.length)]
 return void  this.client.sendMessage( M.from, { url: hug }, 
        MessageType.video, 
          { mimetype: Mimetype.gif, caption: `@${user1.split('@')[0]} hugged @${user2.split('@')[0]}`, contextInfo: {mentionedJid : [user1, user2]} }
      )         


    }
}
