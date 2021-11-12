import { MessageType } from '@adiwajshing/baileys'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import Genius from 'genius-lyrics
import​ ​request​ ​from​ ​'../../lib/request'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'lyrics', 
 ​           ​description​: ​'Gives you the lyrics of the given song.'​,
            category: 'media',
            aliases: ['ly'],
            usage: `${client.config.prefix}lyrics [song name]`,
            dm: true,
            baseXp: 40
        })
    }
    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        ​if​ ​(​!​this​.​client​.​config​.​geniusKey​) 
 ​                        ​return​ ​void​ ​M​.​reply​(​"No Genius Access Token set."​)​; 
 ​        ​if​ ​(​!​joined​)​ ​return​ ​void​ ​M​.​reply​(​'Give me a song name to fetch the lyrics, Baka!'​) 
 ​        ​const​ ​chitoge​ ​=​ ​joined​.​trim​(​) 
 ​        ​const​ ​Client​ ​=​ ​new​ ​Genius​.​Client​(​this​.​client​.​config​.​geniusKey​) 
 ​        ​const​ ​search​ ​=​ ​await​ ​Client​.​songs​.​search​(​chitoge​) 
 ​        ​if​(​search​.​error​)​ ​return​ ​void​ ​M​.​reply​(​`Couldn't find any matching song results.`​) 
 ​        ​const​ ​lyrics​ ​=​ ​await​ ​search​[​0​]​.​lyrics​(​) 
 ​        ​let​ ​text​ ​=​ ​`🎀 *Title: ​${​search​[​0​]​.​title​}​*\n\n` 
 ​            ​text​ ​+=​ ​`🌐 *URL: ​${​search​[​0​]​.​url​}​*\n` 
 ​            ​M​.​reply​( 
 ​                ​await​ ​request​.​buffer​(​search​[​0​]​.​image​)​, 
 ​                ​MessageType​.​image​, 
 ​                ​undefined​, 
 ​                ​undefined​, 
 ​                ​text 
 ​                ​// eslint-disable-next-line @typescript-eslint/no-explicit-any 
 ​            ​)​.​catch​(​(​reason​: ​any​)​ ​=>​ ​M​.​reply​(​`​${​text​}​`​)​) 
 ​            ​await​ ​M​.​reply​(​lyrics​) 
 ​        ​}​; 
 ​    ​}​ 
