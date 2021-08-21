import { MessageType } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'status',
            description: 'Puts the text as status ',
            category: 'dev',
            dm: true,
            usage: `${client.config.prefix}status [text] [tag Image/Video]`
        })
    }

    run = async (M: ISimplifiedMessage, parsedArgs: IParsedArgs): Promise<void> => {
        if (!this.client.config.mods?.includes(M.sender.jid)) return void null
        const text = parsedArgs.joined
        let buffer
        if (M.quoted?.message?.message?.imageMessage){
            buffer = await this.client.downloadMediaMessage(M.quoted.message)
            this.client.sendMessage('status@broadcast', buffer, MessageType.image)
        }
        else if (M.WAMessage.message?.imageMessage){
            buffer = await this.client.downloadMediaMessage(M.WAMessage)
            this.client.sendMessage('status@broadcast',buffer, MessageType.image)
        }
        else if (M.quoted?.message?.message?.videoMessage){
            buffer = await this.client.downloadMediaMessage(M.quoted.message)
            this.client.sendMessage('status@broadcast', buffer, MessageType.video)
        }
        else if (M.WAMessage.message?.videoMessage){
            buffer = await this.client.downloadMediaMessage(M.WAMessage)
            this.client.sendMessage('status@broadcast', buffer, MessageType.video)
        }
        else if (text)
            this.client.sendMessage('status@broadcast', text, MessageType.text)
        else
            M.reply("Use Image/Video via Tagging it or/and use text")
      }
}
