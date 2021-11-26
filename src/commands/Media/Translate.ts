/** @format */

import translate from "translate-google";
import MessageHandler from "../../Handlers/MessageHandler";
import BaseCommand from "../../lib/BaseCommand";
import WAClient from "../../lib/WAClient";
import { IParsedArgs, ISimplifiedMessage } from "../../typings";

export default class Command extends BaseCommand {
	constructor(client: WAClient, handler: MessageHandler) {
		super(client, handler, {
			command: "translate",
			aliases: ["tr"],
			description: "Will translate the given word to your selected language. ",
			category: "media",
			usage: `${client.config.prefix}tr <word>|<language_code>\n\nExample: ${client.config.prefix}tr zh-cn|Hello`,
			baseXp: 40,
		});
	}

	run = async (
		M: ISimplifiedMessage,
		{ joined }: IParsedArgs
	): Promise<void> => {
		const texts = joined.trim().split("|");
		if (texts[0] === "")
			return void M.reply(
				`Use ${this.client.config.prefix}tr (word_that_you_wanna_translate|language_code)`
			);
		const word = texts[0];
		const code = texts[1];
		if (!code) return void M.reply("Kindly provide the language code");
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const response = await translate(word, { to: code }).catch((err: any) => {
			return void M.reply(`Invalid language code, kindly use a standard code`);
		});
		const text = `${response}`;
		M.reply(text);
	};
}
