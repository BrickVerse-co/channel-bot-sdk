// (c) 2026 Meta Games LLC. All rights reserved.

import { ChannelBotClient, CommandRouter } from "../src/index";

async function main() {
	const token = process.env.BOT_TOKEN;
	if (!token) throw new Error("BOT_TOKEN is required");

	const client = new ChannelBotClient({
		token,
		apiBaseUrl: process.env.BOT_API_BASE_URL || "https://api.brickverse.gg",
	});

	const router = new CommandRouter()
		.command("ping", async (ctx) => {
			await ctx.replyMention("pong");
		})
		.command("echo", async (ctx) => {
			await ctx.reply(ctx.args.join(" ") || "Nothing to echo.");
		});

	client.useCommandRouter(router);

	client.on("guildBot.ready", (event) => {
		console.log(`ready as ${event.bot.username}`);
	});

	await client.connect();
}

void main();
