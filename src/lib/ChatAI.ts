import axios from 'axios'
import chalk from 'chalk'
import type WAClient from './WAClient.js'

type Turn = { user: string; bot: string }
type ChatState = {
    memory: string
    recent: Turn[]
    updated: number
}

type ProviderName = 'groq' | 'cerebras' | 'gemini' | 'openrouter'

type ChatInput = {
    jid: string
    senderName: string
    text: string
    audio?: { buffer: Buffer; mime: string }
}

type ChatOk = { ok: true; reply: string; provider: ProviderName }
type ChatErr = { ok: false; error: string }
type ChatResult = ChatOk | ChatErr

const SYSTEM_PROMPT =
    "You are Kaoi, a friendly WhatsApp bot. You chat one-on-one or in groups. Reply casually and briefly — 1 to 2 short sentences, like a real WhatsApp message. No markdown, no bullet lists, avoid emoji spam. Be warm and conversational.\n\n" +
    "You receive a memory blob (summary of prior conversation) plus the latest exchanges and the new user message. Use them for context.\n\n" +
    "Respond with ONLY a JSON object (no other text, no code fences) with exactly two keys:\n" +
    "  - \"reply\": your reply to the user as plain text\n" +
    "  - \"memory\": an updated compressed memory blob (under 400 chars) capturing the user's name, what they care about, preferences, ongoing topics. Rewrite the prior memory so important things survive but trivia is dropped. If you have no memory yet, start fresh.\n\n" +
    "Output JSON only."

const RECENT_TURN_CAP = 4
const MEMORY_CHAR_CAP = 600
const IDLE_TTL_MS = 60 * 60 * 1000

export default class ChatAI {
    private store = new Map<string, ChatState>()
    private gcTimer: NodeJS.Timeout | null = null

    constructor(private client: WAClient) {
        this.gcTimer = setInterval(() => this.gc(), 10 * 60 * 1000)
        if (this.gcTimer.unref) this.gcTimer.unref()
    }

    chat = async (input: ChatInput): Promise<ChatResult> => {
        const state = this.getState(input.jid)
        const userPayload = this.buildUserPayload(state, input.senderName, input.text)
        const order = this.providerOrder(!!input.audio)
        if (!order.length)
            return { ok: false, error: 'No AI provider key configured (set GROQ_API_KEY / CEREBRAS_API_KEY / GEMINI_API_KEY).' }

        let lastErr = ''
        for (const provider of order) {
            try {
                const parsed = await this.callProvider(provider, userPayload, input.audio)
                if (!parsed) continue
                this.commit(input.jid, state, input.text, parsed.reply, parsed.memory)
                return { ok: true, reply: parsed.reply, provider }
            } catch (err) {
                lastErr = err instanceof Error ? err.message : String(err)
                this.client.log(chalk.yellow(`ChatAI ${provider} failed: ${lastErr}`))
                continue
            }
        }
        return { ok: false, error: lastErr || 'All providers failed' }
    }

    /** Forget any memory for this chat (used on `!chat stop`). */
    forget = (jid: string): void => {
        this.store.delete(jid)
    }

    private providerOrder = (hasAudio: boolean): ProviderName[] => {
        const cfg = this.client.config
        if (hasAudio) return cfg.geminiKey ? ['gemini'] : []
        const out: ProviderName[] = []
        if (cfg.groqKey) out.push('groq')
        if (cfg.cerebrasKey) out.push('cerebras')
        if (cfg.geminiKey) out.push('gemini')
        if (cfg.openrouterKey) out.push('openrouter')
        return out
    }

    private getState = (jid: string): ChatState => {
        const existing = this.store.get(jid)
        if (existing) return existing
        const fresh: ChatState = { memory: '', recent: [], updated: Date.now() }
        this.store.set(jid, fresh)
        return fresh
    }

    private buildUserPayload = (state: ChatState, senderName: string, text: string): string => {
        const lines: string[] = []
        lines.push(`[Memory of prior conversation]`)
        lines.push(state.memory ? state.memory : '(none yet)')
        lines.push('')
        if (state.recent.length) {
            lines.push('[Recent exchanges]')
            for (const t of state.recent) {
                lines.push(`User (${senderName}): ${t.user}`)
                lines.push(`Kaoi: ${t.bot}`)
            }
            lines.push('')
        }
        lines.push('[New message]')
        lines.push(`User (${senderName}): ${text || '(voice note — see attached audio)'}`)
        return lines.join('\n')
    }

    private commit = (jid: string, state: ChatState, userText: string, reply: string, memory: string): void => {
        const cleanMemory = (memory || '').slice(0, MEMORY_CHAR_CAP)
        state.memory = cleanMemory
        state.recent.push({ user: userText || '(audio)', bot: reply })
        if (state.recent.length > RECENT_TURN_CAP) state.recent.splice(0, state.recent.length - RECENT_TURN_CAP)
        state.updated = Date.now()
        this.store.set(jid, state)
    }

    private gc = (): void => {
        const cutoff = Date.now() - IDLE_TTL_MS
        for (const [jid, s] of this.store) if (s.updated < cutoff) this.store.delete(jid)
    }

    private callProvider = async (
        provider: ProviderName,
        userPayload: string,
        audio?: { buffer: Buffer; mime: string }
    ): Promise<{ reply: string; memory: string } | null> => {
        if (provider === 'gemini') return this.callGemini(userPayload, audio)
        return this.callOpenAICompat(provider, userPayload)
    }

    private callOpenAICompat = async (
        provider: 'groq' | 'cerebras' | 'openrouter',
        userPayload: string
    ): Promise<{ reply: string; memory: string } | null> => {
        const cfg = this.client.config
        let url = ''
        let key = ''
        let model = ''
        if (provider === 'groq') {
            url = 'https://api.groq.com/openai/v1/chat/completions'
            key = cfg.groqKey
            model = 'llama-3.3-70b-versatile'
        } else if (provider === 'cerebras') {
            url = 'https://api.cerebras.ai/v1/chat/completions'
            key = cfg.cerebrasKey
            model = 'llama-3.3-70b'
        } else {
            url = 'https://openrouter.ai/api/v1/chat/completions'
            key = cfg.openrouterKey
            model = 'meta-llama/llama-3.3-70b-instruct:free'
        }

        const res = await axios.post(
            url,
            {
                model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPayload }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.8,
                max_tokens: 500
            },
            {
                headers: {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                timeout: 25_000
            }
        )

        const raw = res.data?.choices?.[0]?.message?.content
        return this.parseModelJson(typeof raw === 'string' ? raw : '')
    }

    private callGemini = async (
        userPayload: string,
        audio?: { buffer: Buffer; mime: string }
    ): Promise<{ reply: string; memory: string } | null> => {
        const cfg = this.client.config
        const model = 'gemini-2.5-flash'
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cfg.geminiKey)}`

        const parts: Array<Record<string, unknown>> = [{ text: userPayload }]
        if (audio) {
            // WhatsApp PTT is OGG/Opus. Normalize to 16kHz mono WAV via ffmpeg so
            // the upload is in a format Gemini reliably parses regardless of the
            // sender's client/codec quirks.
            const wav = await this.client.util.transcodeAudioToWav(audio.buffer)
            parts.push({
                inline_data: {
                    mime_type: 'audio/wav',
                    data: wav.toString('base64')
                }
            })
        }

        const res = await axios.post(
            url,
            {
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ role: 'user', parts }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.8,
                    maxOutputTokens: 600
                }
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 30_000 }
        )

        const candidates = res.data?.candidates as Array<{
            content?: { parts?: Array<{ text?: string }> }
        }> | undefined
        const raw = candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
        return this.parseModelJson(raw)
    }

    /** Parse the JSON envelope. Tolerates code fences and extraneous text. */
    private parseModelJson = (raw: string): { reply: string; memory: string } | null => {
        if (!raw) return null
        let candidate = raw.trim()
        const fenceMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i)
        if (fenceMatch) candidate = fenceMatch[1].trim()
        // Find the outermost {...} if model added prefix/suffix prose.
        const start = candidate.indexOf('{')
        const end = candidate.lastIndexOf('}')
        if (start >= 0 && end > start) candidate = candidate.slice(start, end + 1)
        try {
            const obj = JSON.parse(candidate)
            const reply = typeof obj.reply === 'string' ? obj.reply.trim() : ''
            const memory = typeof obj.memory === 'string' ? obj.memory.trim() : ''
            if (!reply) return null
            return { reply, memory }
        } catch {
            // Last-resort: treat the entire raw as the reply, leave memory unchanged.
            const reply = raw.trim().replace(/^```[a-zA-Z]*\n?|```$/g, '').trim()
            if (!reply) return null
            return { reply, memory: '' }
        }
    }
}
