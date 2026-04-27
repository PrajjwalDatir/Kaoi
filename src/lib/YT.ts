import { youtubeDl, type Payload } from 'youtube-dl-exec'
import { readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import request from './request.js'

const YT_URL_RE =
    /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)[\w-]{11}/

const YT_ID_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/))([\w-]{11})/

/** Shared yt-dlp flags. `player_client=tv,android,web` tries the TV and Android
 * API endpoints first — these often skip age-gates and sometimes bot checks
 * that the default web client trips. For videos these tricks can't bypass,
 * set `YT_COOKIES_BROWSER` (chrome|firefox|safari|edge|brave) so yt-dlp
 * extracts cookies from your logged-in browser, or `YT_COOKIES_FILE` to
 * point at a Netscape cookies.txt. */
const ytdlpBaseFlags = (): Record<string, unknown> => ({
    noWarnings: true,
    noCheckCertificates: true,
    extractorArgs: 'youtube:player_client=tv,android,web',
    ...(process.env.YT_COOKIES_BROWSER ? { cookiesFromBrowser: process.env.YT_COOKIES_BROWSER } : {}),
    ...(process.env.YT_COOKIES_FILE ? { cookies: process.env.YT_COOKIES_FILE } : {})
})

export default class YT {
    id: string

    constructor(public url: string, public type: 'audio' | 'video') {
        this.id = this.parseId()
    }

    validateURL = (): boolean => YT_URL_RE.test(this.url)

    getInfo = async (): Promise<Payload> =>
        (await youtubeDl(this.url, {
            ...ytdlpBaseFlags(),
            dumpSingleJson: true,
            preferFreeFormats: true
        } as Parameters<typeof youtubeDl>[1])) as Payload

    /** WhatsApp audio playback is finicky on Android: yt-dlp's default MP3 output
     * (VBR libmp3lame + ID3v2 with embedded thumbnail) plays on iOS but often
     * fails on Android. AAC-in-M4A (audio/mp4) is the universally-compatible
     * path — YouTube's `bestaudio[ext=m4a]` (itag 140) is already AAC, so
     * yt-dlp extracts it without re-encoding. */
    getBuffer = async (
        filename = path.join(
            tmpdir(),
            `${Math.random().toString(36).slice(2)}.${this.type === 'audio' ? 'm4a' : 'mp4'}`
        )
    ): Promise<Buffer> => {
        const common = { ...ytdlpBaseFlags(), output: filename }
        const flags =
            this.type === 'audio'
                ? {
                      ...common,
                      // Prefer m4a/AAC audio-only (no re-encode), fall back to any
                      // audio-only stream (ffmpeg transcodes to m4a), and finally
                      // to a muxed best stream — some videos publish only combined
                      // formats under the player_clients we use, so without this
                      // fallback yt-dlp errors with "Requested format is not available".
                      format: 'bestaudio[ext=m4a]/bestaudio/best',
                      extractAudio: true,
                      audioFormat: 'm4a',
                      audioQuality: 0
                  }
                : { ...common, format: 'best[ext=mp4][height<=720]/best[height<=720]/best' }
        await youtubeDl(this.url, flags as Parameters<typeof youtubeDl>[1])
        try {
            return await readFile(filename)
        } finally {
            unlink(filename).catch(() => {})
        }
    }

    getThumbnail = async (): Promise<Buffer> => await request.buffer(`https://i.ytimg.com/vi/${this.id}/hqdefault.jpg`)

    parseId = (): string => {
        const m = this.url.match(YT_ID_RE)
        return m ? m[1] : ''
    }
}
