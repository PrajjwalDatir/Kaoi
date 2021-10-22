import { Message } from "@open-wa/wa-automate";
import { DefineCommand } from "../../decorators/DefineCommand";
import BaseCommand from "../../libs/BaseCommand";
@DefineCommand("todos", {
    adminOnly: true,
    aliases: ["everyone", "anuncio"],
    category: "group",
    cooldown: 60,
    description: {
        content: "Menciona todos membros do grupo."
    },
    groupOnly: true
})
export default class extends BaseCommand {
    public async exec(msg: Message): Promise<void> {
        const result: string[] = [];
        const members = await this.client.getGroupMembers(msg.chatId as Message["chat"]["groupMetadata"]["id"]);
        for (const member of members) {
            if (member.isMe) continue;
            result.push(`@${member.id.replace(/@c.us/g, "")}`);
        }
        await this.client.sendTextWithMentions(msg.chatId, result.join(" "), false);
    }
}
