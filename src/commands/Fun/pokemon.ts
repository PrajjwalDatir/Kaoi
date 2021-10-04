import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import axios from 'axios'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'quote',
            description: 'Gives you the data and stats of the given pokemon.',
            aliases: ['pkmn'],
            category: 'fun',
            usage: `${client.config.prefix}pokemon [name]`
           
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void M.reply('Do you want me give you the data of an unknown pokemon, Baka!')
        const kaoi = joined.trim()
        await axios.get(`https://pokeapi.co/api/v2/pokemon/${kaoi}`)
        .then((response) => {
                // console.log(response);
                const text = `🌟 *Name: ${response.data.name}*\n〽️ *Pokedex ID: ${response.data.id}*\n⚖ *Weight: ${response.data.weight}*\n🔆 *Height: ${response.data.height}*\n🌟 *Base Experience: ${response.data.base_experience}*\n📛 *Abilities: ${response.data.abilities[0].ability.name}, ${response.data.abilities[1].ability.name}*\n🎀 *Type: ${response.data.types[0].type.name}*\n✳ *HP: ${response.data.stats[0].base_stat}*\n⚔ *Attack: ${response.data.stats[1].base_stat}*\n🔰 *Defense: ${response.data.stats[2].base_stat}*\n☄ *Special Attack: ${response.data.stats[3].base_stat}*\n🛡 *Special Defense:${response.data.stats[4].base_stat}*\n🎐 *Speed: ${response.data.stats[5].base_stat}*\n`
                M.reply(text);
            }).catch(err => {
                M.reply(`No such pokemon name, Baka! `)
            }
            )
    };
}
