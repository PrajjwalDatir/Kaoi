import MessageHandler from '../Handlers/MessageHandler'
import BaseCommand from '../lib/BaseCommand'
import WAClient from '../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../typings'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'img',
            description: 'Convert a given sticker into a gif or image',
            category: 'utils',
            usage: `${client.config.prefix}img`
        })
    }

    
    run = async (M: ISimplifiedMessage, args: IParsedArgs): Promise<void> => {}
}

return void (await this.client.reply(
                        from,
                        !media || !M.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage
                            ? { body: `Tag the sticker you want to convert` }
                            : M.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage.isAnimated
                            ? await convertStickerToVideo(
                                  await this.client.downloadAndSaveMediaMessage(
                                      media,
                                      `${tmpdir()}/${Math.random().toString(36)}`
                                  )
                              )
                            : await convertStickerToImage(
                                  await this.client.downloadAndSaveMediaMessage(
                                      media,
                                      `${tmpdir()}/${Math.random().toString(36)}`
                                  )
                              ),
                        M
                    ))
