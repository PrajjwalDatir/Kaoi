import { config } from 'dotenv'

config()

import MessageHandler from './Handlers/MessageHandler'
import WAClient from './lib/WAClient'
import Server from './lib/Server'
import mongoose from 'mongoose'
import chalk from 'chalk'
import CallHandler from './Handlers/CallHandler'
import AssetHandler from './Handlers/AssetHandler'
import EventHandler from './Handlers/EventHandler'

if (!process.env.MONGO_URI) throw new Error('MONGO URL IS NOT PROVIDED')
const client = new WAClient({
    name: process.env.NAME || 'Void',
    session: process.env.SESSION || 'Void',
    prefix: process.env.PREFIX || '!',
    mods: (process.env.MODS || '').split(',').map((number) => `${number}@s.whatsapp.net`)
})
client.log('Starting...')

const messageHandler = new MessageHandler(client)
const callHandler = new CallHandler(client)
const assetHandler = new AssetHandler(client)
const eventHandler = new EventHandler(client)
messageHandler.loadCommands()
assetHandler.loadAssets()

const db = mongoose.connection

new Server(Number(process.env.PORT) || 4040, client)

const start = async () => {
    client.on('open', async () => {
        client.log(
            chalk.green(
                `Connected to WhatsApp as ${chalk.blueBright(
                    client.user.notify || client.user.vname || client.user.name || client.user.jid.split('@')[0]
                )}`
            )
        )
        await client.saveAuthInfo(client.config.session)
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
