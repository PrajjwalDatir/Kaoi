import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { ISimplifiedMessage } from '../../typings/index.js'
import { migrateShipData } from '../../lib/Ship/migrate.js'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'shipmigrate',
            description:
                'One-off migration: normalizes JIDs across all bonds/rizz docs and recomputes base scores under the current formula. Idempotent.',
            category: 'dev',
            dm: true,
            modsOnly: true,
            usage: `${client.config.prefix}shipmigrate`,
            baseXp: 0
        })
    }

    run = async (M: ISimplifiedMessage): Promise<void> => {
        await M.reply('🔧 Running ship data migration…')
        try {
            const report = await migrateShipData(this.client)
            const lines = [
                '✅ *Ship migration complete*',
                '',
                '*Bonds*',
                `  Scanned:        ${report.bondsScanned}`,
                `  Rekeyed:        ${report.bondsRekeyed}`,
                `  Merged:         ${report.bondsMerged}`,
                `  Base recomputed:${report.bondsBaseUpdated}`,
                '',
                '*Rizz*',
                `  Scanned:        ${report.rizzScanned}`,
                `  Rekeyed:        ${report.rizzRekeyed}`,
                `  Merged:         ${report.rizzMerged}`,
                `  Base recomputed:${report.rizzBaseUpdated}`
            ]
            await M.reply(lines.join('\n'))
        } catch (err) {
            await M.reply(`❌ Migration failed: ${String(err)}`)
        }
    }
}
