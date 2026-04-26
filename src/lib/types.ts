// Compat shim for the legacy `@adiwajshing/baileys` enums used throughout the
// codebase. The string values match the proto field names so they double as
// keys into `proto.IMessage`. WAClient.reply() translates these to the v7
// object-form `sendMessage` payload.
export const MessageType = {
    text: 'conversation',
    extendedText: 'extendedTextMessage',
    image: 'imageMessage',
    video: 'videoMessage',
    audio: 'audioMessage',
    sticker: 'stickerMessage',
    document: 'documentMessage',
    contact: 'contactMessage',
    location: 'locationMessage'
} as const

export type MessageType = (typeof MessageType)[keyof typeof MessageType]

export const Mimetype = {
    gif: 'image/gif',
    webp: 'image/webp',
    png: 'image/png',
    jpeg: 'image/jpeg',
    mp4: 'video/mp4',
    ogg: 'audio/ogg; codecs=opus',
    pdf: 'application/pdf'
} as const

export type Mimetype = (typeof Mimetype)[keyof typeof Mimetype]

export type WAParticipantAction = 'add' | 'remove' | 'promote' | 'demote'

// Legacy compat: in v6 this enum drove `client.groupSettingChange(...)`. v7
// replaces it with `groupSettingUpdate(jid, 'announcement' | 'not_announcement' | ...)`,
// so we keep the symbol as a no-op marker — WAClient.groupSettingChange ignores
// the second arg and uses the boolean third arg to choose between the modes.
export const GroupSettingChange = {
    messageSend: 'announcement',
    settingsChange: 'locked'
} as const

export type GroupSettingChange = (typeof GroupSettingChange)[keyof typeof GroupSettingChange]

// Re-export commonly-used Baileys types so commands don't need to import them
// from `baileys` directly. proto is a runtime value too.
export { proto } from 'baileys'
export type { proto as protoType } from 'baileys'
