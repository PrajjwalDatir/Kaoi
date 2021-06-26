import express, { NextFunction, Request, Response } from 'express'
import { EventEmitter } from 'events'
import WAClient from './WAClient'
import { join } from 'path'

export default class Server extends EventEmitter {
    app = express()
    WARouter = express.Router()

    constructor(public PORT: number, public client: WAClient) {
        super()
        this.app.use(express.static(join(__dirname, '..', '..', 'public')))
        this.app.use('/wa', this.WARouter)
        this.WARouter.use(this.auth)
        this.WARouter.get('/qr', (req, res) => {
            if (!this.client.QR)
                return void res.json({
                    message: this.client.state === 'open' ? "You're already authenticated" : 'QR is not generated yet'
                })
            res.contentType('image/png')
            return void res.send(this.client.QR)
        })
        this.app.listen(PORT, () => this.client.log(`Server Started on PORT: ${PORT}`))
    }

    auth = (req: Request, res: Response, next: NextFunction): void => {
        const { session } = req.query
        if (!session) return void res.json({ message: `Session Query not provided` })
        if (session !== this.client.config.session) return void res.json({ message: `Invalid Session ID` })
        next()
    }
}
