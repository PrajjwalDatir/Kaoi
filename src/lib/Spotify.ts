import Spotify from 'spotifydl-core'

/** Using public keys */
const client = new Spotify({
    clientId: 'acc6302297e040aeb6e4ac1fbdfd62c3',
    clientSecret: '0e8439a1280a43aba9a5bc0a16f3f009'
})

export default class {
    constructor(public url: string) {}

    getInfo = async (): Promise<{
        name?: string
        artists?: string[]
        album_name?: string
        release_date?: string
        cover_url?: string
        error?: string
    }> => {
        try {
            return await client.getTrack(this.url)
        } catch {
            return { error: `Error Fetching ${this.url}` }
        }
    }

    getAudio = async (): Promise<Buffer> => await client.downloadTrack<undefined>(this.url)
}
