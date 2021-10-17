import axios from 'axios'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'

// https://docs.github.com/en/rest/reference/users
interface UserInfo {
    login: string
    avatar_url: string
    html_url: string
    name: string
    repos_url: string
    location: string | null
    email: string | null
    bio: string | null
    twitter_username: string | null
    public_repos: number
    public_gists: number
    followers: number
    following: number
    created_at: string
    updated_at: string
    hireable: boolean
    blog: string | null
    company: string | null
    gravatar_id: string | null
}

// https://docs.github.com/en/rest/reference/repos
interface RepoInfo {
    name: string
    full_name: string
    owner: UserInfo
    description: string | null
    language: string
    stargazers_count: number
    watchers_count: number
    forks_count: number
    open_issues_count: number
    license: {
        name: string
    }
    created_at: string
    updated_at: string
}

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'github',
            aliases: ['gh'],
            description: 'Get github information about a user/repo',
            category: 'educative',
            usage: `${client.config.prefix}github`
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        const terms = joined.trim().split('/')
        if (terms[0] === '')
            return void M.reply(`Arguments not found : Use ${this.client.config.prefix}gh (username/repo | username)`)
        const username = terms[0]
        const repo = terms.length > 1 ? terms[1] : null
        let text = ''
        if (!repo) {
            const userInfo = await axios
                .get<UserInfo>(`https://api.github.com/users/${username}`)
                .then((res) => res.data)
                .catch((err) => {
                    console.log(err)
                    return void M.reply('🟥 ERROR 🟥\n Failed to fetch the User')
                })

            if (userInfo === undefined) {
                return void M.reply('🟥 ERROR 🟥\n Failed to fetch the User')
            }

            // prepare text information
            text += `*🐙 Link :* http://github.com/${username}\n`
            text += `*📝 Name:* ${userInfo.name}\n`
            if (userInfo.email !== null) text += `*📧 Email:* ${userInfo.email}\n`
            if (userInfo.location !== null) text += `*📍 Location:* ${userInfo.location}\n`
            if (userInfo.bio !== null) text += `*ℹ️ Bio:* ${userInfo.bio}\n`
            text += `*👥 Followers:* ${userInfo.followers}\n*👥 Following:* ${userInfo.following}\n`
            text += `*🎒 Repositories:* ${userInfo.public_repos}\n`
            return void M.reply(text)
        } else {
            const repoInfo = await axios
                .get<RepoInfo>(`https://api.github.com/repos/${username}/${repo}`)
                .then((res) => res.data)
                .catch((err) => {
                    console.log(err)
                    return void M.reply('🟥 ERROR 🟥\n Failed to fetch the Repo')
                })

            if (repoInfo === undefined) {
                return void M.reply('🟥 ERROR 🟥\n Failed to fetch the Repo')
            }

            // prepare text information
            text += `*🐙 Link :* http://github.com/${username}/${repo}\n`
            text += `*🎒 Repository Name :* ${repoInfo.name}\n`
            text += `*ℹ️ Description:* ${repoInfo.description ?? '-'}\n`
            text += `*📜 Licence:* ${repoInfo.license.name}\n`
            text += `*🌟 Stars:* ${repoInfo.stargazers_count}\n`
            text += `*💻 Language:* ${repoInfo.language}\n`
            text += `*🍴 Forks:* ${repoInfo.forks_count}\n`
            text += `*⚠️ Issues:* ${repoInfo.open_issues_count}\n`
            text += `*📅 Created:* ${repoInfo.created_at}\n`
            text += `*📅 Updated:* ${repoInfo.updated_at.slice(0, 11)}\n`

            return void M.reply(text)
        }
    }
}
