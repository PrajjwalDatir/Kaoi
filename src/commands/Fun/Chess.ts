import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import { MessageType, Mimetype } from '@adiwajshing/baileys'
import EventEmitter from 'events'
import Game, { genRealMove } from 'chess-node'
import CIG from 'chess-image-generator'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'chess',
            description: 'Chessssssss',
            category: 'fun',
            usage: `${client.config.prefix}chess`
        })
    }

    games = new Map<string, Game | undefined>()
    challenges = new Map<string, { challenger: string; challengee: string } | undefined>()
    ongoing = new Set<string>()

    parseBoard = (board: string[]): string[][] =>
        this.client.util
            .chunk(
                board.map((tile) => {
                    if (tile === 'bK') return 'k'
                    if (tile === 'wK') return 'K'
                    if (tile === 'wk') return 'N'
                    if (tile === 'bk') return 'n'
                    if (tile[0] === 'w') return tile[1].toUpperCase()
                    return tile[1].toLowerCase()
                }),
                8
            )
            .reverse()

    run = async (M: ISimplifiedMessage, { args }: IParsedArgs): Promise<void> => {
        const end = async (winner?: 'Black' | 'White' | string) => {
            const game = this.games.get(M.from)
            const challenge = this.challenges.get(M.from)
            if (!game || !challenge) return void null
            const w = winner?.endsWith('.net')
                ? winner
                : winner === 'White'
                ? challenge.challenger
                : winner === 'Black'
                ? challenge.challengee
                : null
            this.challenges.set(M.from, undefined)
            this.games.set(M.from, undefined)
            this.ongoing.delete(M.from)
            if (!w) return void this.client.sendMessage(M.from, 'Match Ended in a Draw!', MessageType.text)
            await this.client.setXp(w, 500, 1000)
            if (w)
                return void this.client.sendMessage(
                    M.from,
                    this.client.assets.get('chess-win') || '',
                    MessageType.video,
                    {
                        caption: `@${w.split('@')[0]} Won! 🎊`,
                        mimetype: Mimetype.gif,
                        contextInfo: { mentionedJid: [w] }
                    }
                )
        }
        const print = (msg: string) => {
            if (msg === 'Invalid Move' || msg === 'Not your turn') return void M.reply(msg)
            this.client.sendMessage(M.from, msg, MessageType.text)
            if (msg.includes('stalemate')) return void end()
            if (msg.includes('wins')) {
                const winner = msg.includes('Black wins') ? 'Black' : 'White'
                return void end(winner)
            }
        }
        if (!args || !args[0])
            return void M.reply(
                this.client.assets.get('chess-notation') || '',
                MessageType.image,
                undefined,
                undefined,
                `♟️ *Chess Commands* ♟️\n\n🎗️ *${this.client.config.prefix}chess challenge* - Challenges the mentioned or quoted person to a chess match\n\n🎀 *${this.client.config.prefix}chess accept* - Accpets the challenge if anyone had challenged you\n\n🔰 *${this.client.config.prefix}chess reject* - Rejects the incomming challenge\n\n💝 *${this.client.config.prefix}chess move [fromTile | 'castle'] [toTile]* - Make a move in the match (refer to the image)\n\n🎋 *${this.client.config.prefix}chess ff* - forfits the match`
            )
        switch (args[0].toLowerCase()) {
            case 'c':
            case 'challenge':
                const challengee = M.quoted && M.mentioned.length === 0 ? M.quoted.sender : M.mentioned[0] || null
                if (!challengee || challengee === M.sender.jid)
                    return void M.reply(`Mention the person you want to challenge`)
                if (this.ongoing.has(M.from) || this.challenges.get(M.from))
                    return void M.reply('A Chess session is already going on')
                if (challengee === this.client.user.jid) return void M.reply(`Challenge someone else`)
                this.challenges.set(M.from, { challenger: M.sender.jid, challengee })
                return void M.reply(
                    `@${M.sender.jid.split('@')[0]} has Challenged @${
                        challengee.split('@')[0]
                    } to a chess match. Use *${this.client.config.prefix}chess accept* to start the challenge`,
                    MessageType.text,
                    undefined,
                    [challengee || '', M.sender.jid]
                )
            case 'a':
            case 'accept':
                const challenge = this.challenges.get(M.from)
                if (challenge?.challengee !== M.sender.jid)
                    return void M.reply('No one challenged you to a chess match')
                this.ongoing.add(M.from)
                const game = new Game(new EventEmitter(), M.from)
                await M.reply(
                    `*Chess Game Started!*\n\n⬜ *White:* @${challenge.challenger.split('@')[0]}\n⬛ *Black:* @${
                        challenge.challengee.split('@')[0]
                    }`,
                    MessageType.text,
                    undefined,
                    Object.values(challenge)
                )
                game.start(print, challenge.challenger, challenge.challengee, async () => {
                    const cig = new CIG()
                    cig.loadArray(this.parseBoard(game.board.getPieces(game.white, game.black)))
                    let sent = false
                    while (!sent) {
                        try {
                            await cig
                                .generateBuffer()
                                .then(async (data) => await this.client.sendMessage(M.from, data, MessageType.image))
                            sent = true
                        } catch (err) {
                            continue
                        }
                    }
                })
                return void this.games.set(M.from, game)
            case 'reject':
                const ch = this.challenges.get(M.from)
                if (ch?.challengee !== M.sender.jid && ch?.challenger !== M.sender.jid)
                    return void M.reply('No one challenged you to a chess match')
                this.challenges.set(M.from, undefined)
                return void M.reply(
                    ch.challenger === M.sender.jid
                        ? `You rejected your challenge`
                        : `You Rejected @${ch.challenger.split('@')[0]}'s Challenge`,
                    MessageType.text,
                    undefined,
                    [ch.challengee || '', M.sender.jid]
                )
            case 'move':
                const g = this.games.get(M.from)
                if (!g) return void M.reply('No Chess sessions are currently going on')
                if (args.length > 3 || args.length < 2)
                    return void M.reply(
                        `The move command must be formatted like: \"${this.client.config.prefix}chess move fromTile toTile\"`
                    )
                if (args[1] == 'castle') {
                    const to = args[2]
                    if (to.length != 2 || !(typeof to[0] == 'string') || isNaN(parseInt(to[1])))
                        return void M.reply(
                            "A move's fromTile and toTile must be of the from 'XZ', where X is a letter A-H, and Z is a number 1-8."
                        )
                    const move = {
                        piece: genRealMove(to)
                    }
                    return void g.eventEmitter.emit(M.from, move, print, M.sender.jid, () => async () => {
                        const cig = new CIG()
                        cig.loadArray(this.parseBoard(g.board.getPieces(g.white, g.black)))
                        let sent = false
                        while (!sent) {
                            try {
                                await cig.generateBuffer().then(async (data) => await M.reply(data, MessageType.image))
                                sent = true
                            } catch (err) {
                                continue
                            }
                        }
                    })
                }
                const from = args[1]
                const to = args[2]
                if (
                    from.length != 2 ||
                    !(typeof from[0] == 'string') ||
                    isNaN(parseInt(from[1])) ||
                    to.length != 2 ||
                    !(typeof to[0] == 'string') ||
                    isNaN(parseInt(to[1]))
                )
                    return void M.reply(
                        "A move's fromTile and toTile must be of the from 'XZ', where X is a letter A-H, and Z is a number 1-8."
                    )
                const toMove = genRealMove(to)
                const fromMove = genRealMove(from)
                if (toMove == null || fromMove == null)
                    return void M.reply(
                        "A move's fromTile and toTile must be of the from 'XZ', where X is a letter A-H, and Z is a number 1-8."
                    )
                const move = {
                    from: fromMove,
                    to: toMove
                }
                return void g.eventEmitter.emit(M.from, move, print, M.sender.jid, async () => {
                    const cig = new CIG()
                    cig.loadArray(this.parseBoard(g.board.getPieces(g.white, g.black)))
                    let sent = false
                    while (!sent) {
                        try {
                            await cig.generateBuffer().then(async (data) => await M.reply(data, MessageType.image))
                            sent = true
                        } catch (err) {
                            continue
                        }
                    }
                })
            case 'ff':
                const ga = this.challenges.get(M.from)
                if (!ga) return void M.reply('No games are currently ongoing')
                const players = Object.values(ga)
                if (players.includes(M.sender.jid)) {
                    await M.reply('You forfited!')
                    return void end(players.filter((player) => M.sender.jid !== player)[0])
                }
                return void M.reply('You are not participating in any games')
            default:
                return void M.reply(`Invalid Usage Format. Use *${this.client.config.prefix}chess* for more info`)
        }
    }
}
