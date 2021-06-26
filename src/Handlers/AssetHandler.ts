import chalk from 'chalk'
import { readFileSync } from 'fs-extra'
import { join } from 'path'
import WAClient from '../lib/WAClient'

export default class {
    path = join(__dirname, '..', '..', 'assets')

    constructor(public client: WAClient) {}

    loadAssets = (): void => {
        const files = this.client.util.readdirRecursive(this.path)
        this.client.log(chalk.green('Loading Assets...'))
        files.map((file) => {
            const buffer = readFileSync(file)
            const split = file.split('/')
            const key = split[split.length - 1].split('.')[0]
            this.client.assets.set(key, buffer)
            this.client.log(`Loaded: ${chalk.green(key)} from ${chalk.green(file)}`)
        })
        this.client.log(`Successfully Loaded ${chalk.greenBright(this.client.assets.size)} Assets`)
    }
}
