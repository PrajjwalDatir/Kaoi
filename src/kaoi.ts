import { config } from 'dotenv'

config()

import mongoose from 'mongoose'
import chalk from 'chalk'
import cron from 'node-cron'
import MessageHandler from './Handlers/MessageHandler.js'
import WAClient from './lib/WAClient.js'
import Server from './lib/Server.js'
import CallHandler from './Handlers/CallHandler.js'
import AssetHandler from './Handlers/AssetHandler.js'
import EventHandler from './Handlers/EventHandler.js'

if (!process.env.MONGO_URI) throw new Error('MONGO URL IS NOT PROVIDED')

const client = new WAClient({
    name: process.env.NAME || 'Kaoi',
    session: process.env.SESSION || 'Kaoi',
    prefix: process.env.PREFIX || '!',
    mods: (process.env.MODS || '').split(',').filter(Boolean).map((number) => `${number}@s.whatsapp.net`),
    gkey: process.env.GOOGLE_API_KEY || '',
    chatBotUrl: process.env.CHAT_BOT_URL || ''
})
client.log('Starting...')

const messageHandler = new MessageHandler(client)
const callHandler = new CallHandler(client)
const assetHandler = new AssetHandler(client)
const eventHandler = new EventHandler(client)

new Server(Number(process.env.PORT) || 4040, client)

const start = async (): Promise<void> => {
    await messageHandler.loadCommands()
    assetHandler.loadAssets()
    messageHandler.loadFeatures()

    client.on('open', () => {
        client.log(
            chalk.green(
                `Connected to WhatsApp as ${chalk.blueBright(
                    client.user.name || client.user.notify || client.user.jid.split('@')[0]
                )}`
            )
        )
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

    client.on('incoming-call', async ({ id, from }: { id: string; from: string }) => {
        const display = client.contacts.get(from)?.notify || from
        client.log(`${chalk.blue('CALL')} From ${display}`)
        await callHandler.rejectCall(from, id)
    })

    client.on('new-message', messageHandler.handleMessage)
    client.on('group-participants-update', eventHandler.handle)

    await client.connect()
}

mongoose
    .connect(process.env.MONGO_URI as string)
    .then(() => {
        client.log(chalk.green('Connected to Database!'))
        start().catch((err) => client.log(String(err), true))
    })
    .catch((err) => {
        client.log(`Database connection failed: ${String(err)}`, true)
        process.exit(1)
    })
