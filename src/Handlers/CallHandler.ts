import WAClient from '../lib/WAClient.js'
import { MessageType } from '../lib/types.js'

export default class CallHandler {
    constructor(public client: WAClient) {}

    rejectCall = async (caller: string, callID: string): Promise<void> => {
        try {
            await this.client.sock.rejectCall(callID, caller)
        } catch {
            /* call already gone */
        }
        await this.client
            .sendMessage(caller, `I'm a Bot. I'm not able to pickup calls.`, MessageType.text)
            .catch(() => undefined)
    }
}
