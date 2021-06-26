import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import getUrls from 'get-urls'

export default class {
    readdirRecursive = (directory: string): string[] => {
        const results: string[] = []

        const read = (path: string): void => {
            const files = readdirSync(path)

            for (const file of files) {
                const dir = join(path, file)
                if (statSync(dir).isDirectory()) read(dir)
                else results.push(dir)
            }
        }
        read(directory)
        return results
    }

    capitalize = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

    getUrls = (text: string): string[] => Array.from(getUrls(text))

    chunk = <T>(arr: T[], length: number): T[][] => {
        const result = []
        for (let i = 0; i < arr.length / length; i++) {
            result.push(arr.slice(i * length, i * length + length))
        }
        return result
    }
}
