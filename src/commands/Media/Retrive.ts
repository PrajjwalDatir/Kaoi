/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageType, proto } from '../../lib/types.js'
import type { WAMessage } from '../../typings/index.js'
import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'retrieve',
            description: 'retrieve viewOnceMessage WhatsApp Message',
            category: 'media',
            usage: `${client.config.prefix}retrieve [Tag the viewOnceMessage]`,
            baseXp: 10
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        if (!M.quoted) return void (await M.reply(`Quote the "viewOnceMessage" you want to retrieve`))
        if (
            !(M?.quoted?.message?.message as proto.Message)?.viewOnceMessage?.message?.videoMessage &&
            !(M.quoted.message?.message as proto.Message).viewOnceMessage?.message?.imageMessage
        )
            return void M.reply('Quote the "viewOnceMessage" that you want to retrieve')
        return void M.reply(
            await this.client.downloadMediaMessage(
                (M.quoted.message?.message as proto.Message).viewOnceMessage as WAMessage
            ),
            MessageType[
                (M.quoted.message?.message as proto.Message).viewOnceMessage?.message?.imageMessage ? 'image' : 'video'
            ],
            undefined,
            undefined,
            'Hippity Hoppity, this message is now public property...'
        )
    }
}
