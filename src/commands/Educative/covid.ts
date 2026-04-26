import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'
import request from '../../lib/request.js'

interface DiseaseShCountry {
    country: string
    cases: number
    todayCases: number
    deaths: number
    todayDeaths: number
    recovered: number
    todayRecovered: number
    active: number
    critical: number
    tests: number
    population: number
    continent: string
}

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'covid',
            description: 'get the covid-19 info of the given country',
            aliases: ['COVID'],
            category: 'educative',
            usage: `${client.config.prefix}covid [country]`
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void M.reply('🔎 Provide a country name')
        const term = joined.trim()
        try {
            const r = await request.json<DiseaseShCountry>(
                `https://disease.sh/v3/covid-19/countries/${encodeURIComponent(term)}`
            )
            const text =
                `🦠 *Covid-19 — ${r.country}*\n\n` +
                `🧪 *Tests:* ${r.tests.toLocaleString()}\n` +
                `🎗 *Active:* ${r.active.toLocaleString()}\n` +
                `🏥 *Total Cases:* ${r.cases.toLocaleString()}\n` +
                `🆕 *New Cases (today):* ${r.todayCases.toLocaleString()}\n` +
                `😳 *Critical:* ${r.critical.toLocaleString()}\n` +
                `☘ *Recovered:* ${r.recovered.toLocaleString()}\n` +
                `💀 *Deaths:* ${r.deaths.toLocaleString()}\n` +
                `💀 *New Deaths (today):* ${r.todayDeaths.toLocaleString()}\n` +
                `🚩 *Continent:* ${r.continent}\n` +
                `👥 *Population:* ${r.population.toLocaleString()}`
            await M.reply(text)
        } catch {
            await M.reply(`🔍 Couldn't find data for "${term}". Use the country's full English name.`)
        }
    }
}
