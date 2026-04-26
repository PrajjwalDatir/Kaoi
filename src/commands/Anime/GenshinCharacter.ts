import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'
import request, { firstOk } from '../../lib/request.js'

interface GenshinCharacter {
    name: string
    vision?: string
    weapon?: string
    nation?: string
    affiliation?: string
    constellation?: string
    rarity?: number | string
    birthday?: string
    description?: string
}

const sources = {
    list: [
        'https://genshin.jmp.blue/characters',
        'https://api.genshin.dev/characters'
    ],
    detail: (slug: string) => [
        `https://genshin.jmp.blue/characters/${slug}`,
        `https://api.genshin.dev/characters/${slug}`
    ]
}

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'genshincharacter',
            description: `Gives you the data of the given genshin character.`,
            aliases: ['gchar', 'genshin'],
            category: 'anime',
            usage: `${client.config.prefix}gchar [name]`,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) {
            const list = await firstOk<string[]>(
                sources.list.map((u) => () => request.json<string[]>(u))
            )
            if (!list.ok) return void M.reply(`Couldn't reach the Genshin API right now.`)
            return void M.reply(`📒 *The searchable characters are:* ${list.value.join(', ')}`)
        }
        const slug = joined.trim().toLowerCase().replace(/\s+/g, '-')
        const detail = await firstOk<GenshinCharacter>(
            sources.detail(slug).map((u) => () => request.json<GenshinCharacter>(u))
        )
        if (!detail.ok) {
            return void M.reply(
                `Sorry, couldn't find character *${joined}*\n🧧 *Use:* ${this.client.config.prefix}gchar to see the full list of searchable characters.\n\n📝 *Note:* Nicknames don't work here.`
            )
        }
        const r = detail.value
        await M.reply(
            `💎 *Name:* ${r.name}\n💠 *Vision:* ${r.vision || '—'}\n📛 *Weapon:* ${
                r.weapon || '—'
            }\n⛩ *Nation:* ${r.nation || '—'}\n📛 *Affiliation:* ${r.affiliation || '—'}\n❄ *Constellation:* ${
                r.constellation || '—'
            }\n🎗 *Rarity:* ${r.rarity ?? '—'} stars\n🎁 *Birthday:* ${r.birthday || '—'}\n💚 *Description:* ${
                r.description || '—'
            }\n`
        )
    }
}
