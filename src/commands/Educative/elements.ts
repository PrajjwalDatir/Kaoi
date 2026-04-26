import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'
import request from '../../lib/request.js'

interface PeriodicTableEntry {
    name: string
    appearance?: string | null
    atomic_mass?: number
    boil?: number | null
    category?: string
    density?: number | null
    discovered_by?: string | null
    melt?: number | null
    molar_heat?: number | null
    named_by?: string | null
    number?: number
    period?: number
    phase?: string
    source?: string
    bohr_model_image?: string
    bohr_model_3d?: string
    spectral_img?: string
    summary?: string
    symbol?: string
    xpos?: number
    ypos?: number
    shells?: number[]
    electron_configuration?: string
    electron_configuration_semantic?: string
    electron_affinity?: number | null
    electronegativity_pauling?: number | null
    ionization_energies?: number[]
    cpk_hex?: string
    image?: { title?: string; url?: string; attribution?: string }
    block?: string
}

interface PeriodicTable {
    elements: PeriodicTableEntry[]
}

const PERIODIC_TABLE_URL =
    'https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json'

let tableCache: Promise<PeriodicTable> | null = null
const loadTable = (): Promise<PeriodicTable> => {
    if (!tableCache) tableCache = request.json<PeriodicTable>(PERIODIC_TABLE_URL)
    return tableCache
}

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'elements',
            description: 'get the info of the chemical element',
            aliases: ['element'],
            category: 'educative',
            usage: `${client.config.prefix}element [symbol or name]`
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void M.reply('🔎 Provide an element symbol or name')
        const term = joined.trim().toLowerCase()
        let table: PeriodicTable
        try {
            table = await loadTable()
        } catch {
            tableCache = null
            return void M.reply(`🔍 Couldn't load the periodic-table data right now`)
        }
        const el = table.elements.find(
            (e) => e.symbol?.toLowerCase() === term || e.name?.toLowerCase() === term
        )
        if (!el) return void M.reply(`🔍 No element matched "${joined}"`)
        const text =
            `🧪 *Name:* ${el.name}\n` +
            `⚛️ *Symbol:* ${el.symbol}\n` +
            `📍 *Atomic Number:* ${el.number}\n` +
            `🧫 *Atomic Mass:* ${el.atomic_mass ?? '—'}\n` +
            `🗃 *Category:* ${el.category ?? '—'}\n` +
            `🔎 *Phase:* ${el.phase ?? '—'}\n` +
            `⚗ *Density:* ${el.density ?? '—'}\n` +
            `🔥 *Melting Point:* ${el.melt ?? '—'} K\n` +
            `💨 *Boiling Point:* ${el.boil ?? '—'} K\n` +
            (el.summary ? `\n📝 ${el.summary}` : '')
        await M.reply(text)
    }
}
