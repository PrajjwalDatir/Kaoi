import request, { firstOk } from './request.js'

export interface IRedditResponse {
    postLink: string
    subreddit: string
    title: string
    url: string
    nsfw: boolean
    spoiler: boolean
    author: string
    ups: number
    preview: string[]
}

export default async (subreddit: string): Promise<IRedditResponse | { error: string }> => {
    const result = await firstOk<IRedditResponse>([
        () => request.json<IRedditResponse>(`https://meme-api.com/gimme/${subreddit}`),
        () => request.json<IRedditResponse>(`https://www.reddit-meme-api.com/gimme/${subreddit}`)
    ])
    if (!result.ok) return { error: 'Invalid Subreddits' }
    if (!result.value.url) return { error: 'Invalid Subreddits' }
    return result.value
}
