import { MessageType } from '@adiwajshing/baileys'
import WAClient from '../lib/WAClient'

export default class CallHandler {
    constructor(public client: WAClient) {}

    rejectCall = async (caller: string, callID: string): Promise<void> => {
        const tag = this.client.generateMessageTag()
        const json = [
            'action',
            'call',
            [
                'call',
                {
                    from: this.client.user.jid,
                    to: caller,
                    id: tag
                },
                [
                    [
                        'reject',
                        {
                            'call-id': callID,
                            'call-creator': caller,
                            count: '0'
                        },
                        null
                    ]
                ]
            ]
        ]

        await this.client.sendWA(`${tag},${JSON.stringify(json)}`)
        await this.client.sendMessage(caller, `I'm sorry. I'm not able pickup calls.`, MessageType.text)
    }
}
