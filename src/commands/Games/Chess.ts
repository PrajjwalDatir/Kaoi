import MessageHandler from '../../Handlers/MessageHandler.js'
import BaseCommand from '../../lib/BaseCommand.js'
import WAClient from '../../lib/WAClient.js'
import { IParsedArgs, ISimplifiedMessage } from '../../typings/index.js'
import { MessageType, Mimetype } from '../../lib/types.js'
import EventEmitter from 'events'
import { readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { createRequire } from 'module'
import sharp from 'sharp'
// chess-node ships Game and genRealMove as named exports, but its `default`
// is also a namespace object containing the same names. Resolve to whichever
// shape is present so this works under both ESM and CJS-interop.
import * as ChessNode from 'chess-node'
type ChessLib = {
    Game: new (e: EventEmitter, jid: string) => ChessGame
    genRealMove: (m: string) => unknown
}
const lib = ((ChessNode as unknown as { default?: ChessLib }).default ?? (ChessNode as unknown as ChessLib))
const Game = lib.Game
const { genRealMove } = lib
type ChessGame = {
    board: { getPieces(white: unknown, black: unknown): string[] }
    eventEmitter: EventEmitter
    white: unknown
    black: unknown
    start(...args: unknown[]): void
}

// We render the board ourselves via sharp instead of chess-image-generator-ts.
// CIG relies on node-canvas's `ctx.fill()` to paint squares; in practice the
// resulting PNG was reaching WhatsApp with the squares missing (only pieces
// visible). Building the board as an SVG and compositing piece PNGs is fully
// deterministic and uses sharp, which is already a dep. We still source the
// piece artwork from CIG's resources so the visual style stays familiar.
const require_ = createRequire(import.meta.url)
const PIECES_DIR = join(
    dirname(require_.resolve('chess-image-generator-ts')),
    'resources',
    'merida'
)

/** chess-node tile codes → CIG piece-asset filenames. Knight is 'wk'/'bk'
 * (lowercase k) in chess-node, which collides with king if you only lowercase
 * — keep the original case for lookup. */
const PIECE_FILE: Record<string, string> = {
    wQ: 'WhiteQueen',
    wK: 'WhiteKing',
    wk: 'WhiteKnight',
    wR: 'WhiteRook',
    wB: 'WhiteBishop',
    wP: 'WhitePawn',
    bQ: 'BlackQueen',
    bK: 'BlackKing',
    bk: 'BlackKnight',
    bR: 'BlackRook',
    bB: 'BlackBishop',
    bP: 'BlackPawn'
}

const BOARD_PX = 480
const SQ_PX = BOARD_PX / 8

const buildBoardSVG = (): Buffer => {
    const rects: string[] = []
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const isDark = (r + c) % 2 === 1
            const fill = isDark ? 'rgb(118,150,86)' : 'rgb(238,238,210)'
            rects.push(
                `<rect x="${c * SQ_PX}" y="${r * SQ_PX}" width="${SQ_PX}" height="${SQ_PX}" fill="${fill}"/>`
            )
        }
    }
    return Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${BOARD_PX}" height="${BOARD_PX}">${rects.join('')}</svg>`
    )
}
const BOARD_SVG = buildBoardSVG()

const pieceCache = new Map<string, Buffer>()
const getPieceBuf = async (code: string): Promise<Buffer | null> => {
    const filename = PIECE_FILE[code]
    if (!filename) return null
    const cached = pieceCache.get(code)
    if (cached) return cached
    const raw = await readFile(join(PIECES_DIR, `${filename}.png`))
    const sized = await sharp(raw)
        .resize(SQ_PX, SQ_PX, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    pieceCache.set(code, sized)
    return sized
}

const RENDER_RETRIES = 3

/** "XZ" where X∈A-H and Z∈1-8 (case-insensitive). Replaces a sloppy
 * length+typeof check that crashed when args were missing. */
const isTile = (s: string | undefined): boolean => !!s && /^[a-hA-H][1-8]$/.test(s)

/** Render the current chess-node board as a PNG buffer and send it. Caps
 * retries so a permanent failure (asset read, WhatsApp rejecting the media)
 * can't peg the CPU. */
async function renderBoard(
    game: ChessGame,
    send: (buf: Buffer) => Promise<unknown>,
    log: (msg: string, error?: boolean) => void
): Promise<void> {
    for (let attempt = 0; attempt < RENDER_RETRIES; attempt++) {
        try {
            // chess-node Board.getPieces() returns a flat 64-entry array,
            // index k → file=(k%8), rank=floor(k/8) (rank 0 = rank 1 = white's
            // back row, so we flip y). Empty squares come back as '  '.
            const tiles = game.board.getPieces(game.white, game.black)
            const composites: sharp.OverlayOptions[] = []
            for (let k = 0; k < tiles.length; k++) {
                const code = tiles[k]
                if (!PIECE_FILE[code]) continue
                const file = k % 8
                const rank = Math.floor(k / 8)
                const buf = await getPieceBuf(code)
                if (buf) composites.push({ input: buf, top: (7 - rank) * SQ_PX, left: file * SQ_PX })
            }
            const out = await sharp(BOARD_SVG).composite(composites).png().toBuffer()
            await send(out)
            return
        } catch (err) {
            log(
                `chess: board render failed (try ${attempt + 1}/${RENDER_RETRIES}): ${
                    err instanceof Error ? err.message : String(err)
                }`,
                true
            )
        }
    }
    log('chess: board render gave up after retries — game continues, image skipped', true)
}

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'chess',
            description: 'Play Chess ♟️ on WhatsApp 🤯',
            category: 'games',
            usage: `${client.config.prefix}chess`,
            baseXp: 20
        })
    }

    games = new Map<string, ChessGame | undefined>()
    challenges = new Map<string, { challenger: string; challengee: string } | undefined>()
    ongoing = new Set<string>()

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
            // chess-node prints a literal 'over' as a final marker after a
            // checkmate banner — surfacing it as a chat message looks broken.
            if (msg === 'over') return
            this.client.sendMessage(M.from, msg, MessageType.text)
            const lower = msg.toLowerCase()
            if (lower.includes('stalemate')) return void end()
            if (lower.includes('wins')) {
                const winner = lower.includes('black wins') ? 'Black' : 'White'
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
                if (this.client.isMe(challengee)) return void M.reply(`Challenge someone else`)
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
                game.start(print, challenge.challenger, challenge.challengee, () =>
                    void renderBoard(
                        game,
                        (buf) => this.client.sendMessage(M.from, buf, MessageType.image),
                        this.client.log
                    )
                )
                return void this.games.set(M.from, game)
            case 'reject':
                const ch = this.challenges.get(M.from)
                if (ch?.challengee !== M.sender.jid && ch?.challenger !== M.sender.jid)
                    return void M.reply('No one challenged you to a chess match')
                // Reject after accept used to leave `games`/`ongoing` set,
                // which permanently blocked future `!chess challenge` in this
                // chat. Wipe everything for a clean slate.
                this.challenges.set(M.from, undefined)
                this.games.set(M.from, undefined)
                this.ongoing.delete(M.from)
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
                // Both forms need exactly two operands after `move`:
                //   !chess move <from> <to>
                //   !chess move castle <to>
                if (args.length !== 3)
                    return void M.reply(
                        `The move command must be formatted like: "${this.client.config.prefix}chess move fromTile toTile" (or "${this.client.config.prefix}chess move castle toTile")`
                    )
                const renderAfter = () =>
                    void renderBoard(
                        g,
                        (buf) => M.reply(buf, MessageType.image) as Promise<unknown>,
                        this.client.log
                    )
                if (args[1] === 'castle') {
                    const to = args[2]
                    if (!isTile(to))
                        return void M.reply(
                            "A move's fromTile and toTile must be of the form 'XZ', where X is a letter A-H, and Z is a number 1-8."
                        )
                    const move = { piece: genRealMove(to) }
                    return void g.eventEmitter.emit(M.from, move, print, M.sender.jid, renderAfter)
                }
                const from = args[1]
                const to = args[2]
                if (!isTile(from) || !isTile(to))
                    return void M.reply(
                        "A move's fromTile and toTile must be of the form 'XZ', where X is a letter A-H, and Z is a number 1-8."
                    )
                const fromMove = genRealMove(from)
                const toMove = genRealMove(to)
                if (toMove == null || fromMove == null)
                    return void M.reply(
                        "A move's fromTile and toTile must be of the form 'XZ', where X is a letter A-H, and Z is a number 1-8."
                    )
                return void g.eventEmitter.emit(
                    M.from,
                    { from: fromMove, to: toMove },
                    print,
                    M.sender.jid,
                    renderAfter
                )
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
