// (c) 2026 Meta Games LLC. All rights reserved.

import { ChannelBotClient, CommandRouter } from "../src/index";

declare const process: {
	env: Record<string, string | undefined>;
};

async function main() {
	const token = process.env.BOT_TOKEN;
	if (!token) throw new Error("BOT_TOKEN is required");

	const client = new ChannelBotClient({
		token,
		apiBaseUrl: process.env.BOT_API_BASE_URL || "https://api.brickverse.gg",
		autoRegisterCommands: true,
	});

	const router = new CommandRouter()
		.command(
			"ping",
			async (ctx) => {
				await ctx.replyMention("pong");
			},
			{ description: "Health check" },
		)
		.command(
			"echo",
			async (ctx) => {
				await ctx.reply(ctx.args.join(" ") || "Nothing to echo.");
			},
			{
				description: "Echo back provided text",
				options: [
					{ name: "text", description: "Text to echo", required: false },
				],
			},
		);

	client.useCommandRouter(router);

	client.on("guildBot.ready", (event) => {
		console.log(`ready as ${event.bot.username}`);
	});

	client.on("guildBot.installationCreate", (event) => {
		console.log(`installed in ${event.guildName} (${event.guildId})`);
	});

	client.on("guildBot.installationDelete", (event) => {
		console.log(`uninstalled from ${event.guildName} (${event.guildId})`);
	});

	await client.connect();
}

void main();
