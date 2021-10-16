import axios from 'axios'
import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'

// https://docs.github.com/en/rest/reference/users
interface UserInfo {
    login: string,
    avatar_url: string,
    html_url: string,
    name: string,
    repos_url: string,
    location: string | null,
    email: string | null,
    bio: string | null,
    twitter_username: string | null,
    public_repos: number,
    public_gists: number,
    followers: number,
    following: number,
    created_at: string,
    updated_at: string,
    hireable: boolean,
    blog: string | null,
    company: string | null,
    gravatar_id: string | null,
}

// https://docs.github.com/en/rest/reference/repos
interface RepoInfo {
    name: string,
    full_name: string,
    owner: UserInfo,
    description: string | null,
    fork: boolean,
    language: string,
    stargazers_count: number,
    watchers_count: number,
    forks_count: number,
    open_issues_count: number,
    license: {
        name: string
    },
    created_at: string,
    updated_at: string,
}

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'github',
            description: 'Get github information about a user/repo',
            category: 'educative',
            usage: `${client.config.prefix}github`
        })
    }

    //eslint-disable-next-line
    run = async (M: ISimplifiedMessage, args: IParsedArgs): Promise<void> => {
      //
        const terms = args.joined.trim().split(' ')
        if (terms.length > 1)
        return void M.reply(
            `The github command must be formatted like: \"${this.client.config.prefix}github (/username/repo | /username)\"`
        )
        const path = terms[0]
        const userRegex = /\/\w+[^\/\w*]/
        if (userRegex.test(path)) {
            // remove first char
            const username = path.substring(1)
            const userInfo = await axios.get<UserInfo>(`https://api.github.com/users/${username}`)
                .then(res => res.data)
                .catch((err) => {
                    console.log(err)
                    return void M.reply('🟥 ERROR 🟥\nThis might be due to API service being down')
                })

            if (userInfo === undefined) {
                return void M.reply('🟥 ERROR 🟥\nThis might be due to API service being down')
            }

            // prepare text information
            let text = ''
            text += `Github: user ${username} information\n`
            text += `\n`
            text += `Name: ${userInfo.name}\n`
            if (userInfo.email !== null)
                text += `Email: ${userInfo.email}\n`
            if (userInfo.location !== null)
                text += `Location: ${userInfo.location}\n`
            if (userInfo.bio !== null)
                text += `Bio: ${userInfo.bio}\n`
            text += `Followers: ${userInfo.followers} Following: ${userInfo.following}\n`
            text += `Repositories: ${userInfo.public_repos}\n`

            return void M.reply(text)
        } else {
            const repoInfo = await axios.get<RepoInfo>(`https://api.github.com/repos${path}`)
                .then(res => res.data)
                .catch((err) => {
                    console.log(err)
                    return void M.reply('🟥 ERROR 🟥\nThis might be due to API service being down')
                })

            if (repoInfo === undefined) {
                return void M.reply('🟥 ERROR 🟥\nThis might be due to API service being down')
            }

            // prepare text information
            let text = ''
            text += `Github: repo ${repoInfo.name} information\n`
            text += `\n`
            text += `Description: ${repoInfo.description ?? '-'}\n`
            text += `Licence: ${repoInfo.license.name}\n`
            text += `Stars: ${repoInfo.stargazers_count}\n`
            text += `Language: ${repoInfo.language}\n`
            text += `Watchers: ${repoInfo.watchers_count}\n`
            text += `Forks: ${repoInfo.forks_count}\n`
            text += `Issues: ${repoInfo.open_issues_count}\n`
            text += `Fork: ${repoInfo.fork ? 'Yes' : 'No'}\n`

            return void M.reply(text)
        }
    }
}
