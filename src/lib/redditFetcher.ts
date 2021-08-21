import request from './request'

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
    try {
        const response = await request.json<IRedditResponse>(`https://meme-api.herokuapp.com/gimme/${subreddit}`)
        if (!response.url) return { error: 'Invalid Subreddits' }
        return response
    } catch (err) {
        return { error: 'Invalid Subreddits' }
    }
}
