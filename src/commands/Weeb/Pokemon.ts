import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import pokedex from 'pokedex-promise-v2'
import request from '../../lib/request'
import { MessageType } from '@adiwajshing/baileys'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'pokemon',
            description: `Gives you the data of the given pokemon.`,
            aliases: ['pkmn'],
            category: 'weeb',
            usage: `${client.config.prefix}pokemon [name/id]`,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void M.reply('Please provide the pokemon name or id.')
        const name = joined.trim()
        console.log(name)
        const pkmn = new pokedex()
        const data = await pkmn.getPokemonByName(name).catch(() => null)
        if (!data) return void (await M.reply(`Invalid pokemon name or id.`))
        let text = ''
        text += `💫 *Name: ${data.name}*\n`
        text += `〽️ *Pokedex ID: ${data.id}*\n`
        text += `⚖ *Weight: ${data.weight}*\n`
        text += `🔆 *Height: ${data.height}*\n`
        text += `🌟 *Base Experience: ${data.base_experience}*\n`
        text += `📛 *Abilities: ${data.abilities[0].ability.name}, ${data.abilities[0].ability.name}*\n`
        text += `🎀 *Type:  ${data.types[0].type.name}*\n`
        text += `✳ *HP: ${data.stats[0].base_stat}*\n`
        text += `⚔ *Attack: ${data.stats[1].base_stat}*\n`
        text += `🔰 *Defense: ${data.stats[2].base_stat}*\n`
        text += `☄ *Special Attack: ${data.stats[3].base_stat}*\n`
        text += `🛡 *Special Defense:${data.stats[4].base_stat}*\n`
        text += `🎐 *Speed: ${data.stats[5].base_stat}*\n`
        const buffer = await request.buffer(data.sprites.front_default).catch((e) => {
            return void M.reply(e.message)
        })
        while (true) {
            try {
                M.reply(
                    buffer || '✖ An error occurred. Please try again later',
                    MessageType.image,
                    undefined,
                    undefined,
                    `${text}`,
                    undefined
                ).catch((err) => {
                    console.log(`${err}`)
                    M.reply(`✖ An error occurred. Please try again later.`)
                })
                break
            } catch (err) {
                M.reply(`✖ An error occurred. Please try again later.`)
                console.log(`${err}`)
            }
        }
        return void null
    }
}
