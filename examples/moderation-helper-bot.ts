// (c) 2026 Meta Games LLC. All rights reserved.

import { ChannelBotClient, CommandRouter } from "../src/index";

async function main() {
	const token = process.env.BOT_TOKEN;
	if (!token) throw new Error("BOT_TOKEN is required");

	const client = new ChannelBotClient({
		token,
		apiBaseUrl: process.env.BOT_API_BASE_URL || "https://api.brickverse.gg",
	});

	const router = new CommandRouter().command("warn", async (ctx) => {
		const target = ctx.args[0];
		const reason = ctx.args.slice(1).join(" ") || "No reason provided";

		if (!target) {
			await ctx.reply("Usage: /warn <username> <reason>");
			return;
		}

		await ctx.replyEmbed({
			title: "Moderator Warning",
			description: `@${target} was warned by @${ctx.user.username}.`,
			fields: [{ name: "Reason", value: reason }],
			color: "#ff6b6b",
		});
	});

	client.useCommandRouter(router);

	client.on("guildBot.ready", (event) => {
		console.log(`ready as ${event.bot.username}`);
	});

	await client.connect();
}

void main();
