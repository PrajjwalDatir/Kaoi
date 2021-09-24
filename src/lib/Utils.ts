import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import getUrls from 'get-urls'
import { exec } from 'child_process'
import { readFile, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { promisify } from 'util'

export default class {
    
    exec = promisify(exec)
    GIFBufferToVideoBuffer = async (image: Buffer): Promise<Buffer> => {
        const filename = `${tmpdir()}/${Math.random().toString(36)}`
        await writeFile(`${filename}.gif`, image)
        await this.exec(
            `ffmpeg -f gif -i ${filename}.gif -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${filename}.mp4`
        )
        const buffer = await readFile(`${filename}.mp4`)
        Promise.all([unlink(`${filename}.mp4`), unlink(`${filename}.gif`)])
        return buffer
    }


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
