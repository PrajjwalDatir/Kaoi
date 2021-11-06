import { config } from 'dotenv'

config()

import MessageHandler from './Handlers/MessageHandler'
import WAClient from './lib/WAClient'
import Server from './lib/Server'
import mongoose from 'mongoose'
import chalk from 'chalk'
import cron from 'node-cron'
import CallHandler from './Handlers/CallHandler'
import AssetHandler from './Handlers/AssetHandler'
import EventHandler from './Handlers/EventHandler'

if (!process.env.MONGO_URI) throw new Error('MONGO URL IS NOT PROVIDED')
const client = new WAClient({
    name: process.env.NAME || 'Kaoi',
    session: process.env.SESSION || 'Kaoi',
    prefix: process.env.PREFIX || '!',
    mods: (process.env.MODS || '').split(',').map((number) => `${number}@s.whatsapp.net`),
    gkey: process.env.GOOGLE_API_KEY || '',
    chatBotUrl: process.env.CHAT_BOT_URL || '',
    gifApi: process.env.TENOR_API_KEY || '',
    weatherAppid: process.env.WEATHER_APIID || ''
})
client.log('Starting...')

const messageHandler = new MessageHandler(client)
const callHandler = new CallHandler(client)
const assetHandler = new AssetHandler(client)
const eventHandler = new EventHandler(client)
messageHandler.loadCommands()
assetHandler.loadAssets()
messageHandler.loadFeatures()

const db = mongoose.connection

new Server(Number(process.env.PORT) || 4040, client)

const start = async () => {
    client.once('open', async () => {
        client.log(
            chalk.green(
                `Connected to WhatsApp as ${chalk.blueBright(
                    client.user.notify || client.user.vname || client.user.name || client.user.jid.split('@')[0]
                )}`
            )
        )
        await client.saveAuthInfo(client.config.session)
        if (process.env.CRON) {
            if (!cron.validate(process.env.CRON))
                return void client.log(`Invalid Cron String: ${chalk.bgRedBright(process.env.CRON)}`, true)
            client.log(`Cron Job for clearing all chats is set for ${chalk.bgGreen(process.env.CRON)}`)
            cron.schedule(process.env.CRON, async () => {
                client.log('Clearing All Chats...')
                await client.modifyAllChats('clear')
                client.log('Cleared all Chats!')
            })
        }
    })

    client.on('CB:Call', async (json) => {
        const isOffer = json[1]['type'] == 'offer'
        const number = `${(json[1]['from'] as string).split('@')[0]}@s.whatsapp.net`
        if (!isOffer) return void null
        client.log(`${chalk.blue('CALL')} From ${client.contacts[number].notify || number}`)
        await callHandler.rejectCall(number, json[1].id)
    })

    client.on('new-message', messageHandler.handleMessage)

    client.on('group-participants-update', eventHandler.handle)

    await client.connect()
}

mongoose.connect(encodeURI(process.env.MONGO_URI), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
})

db.once('open', () => {
    client.log(chalk.green('Connected to Database!'))
    client.getAuthInfo(client.config.session).then((session) => {
        if (session) client.loadAuthInfo(session)
        start()
    })
})
