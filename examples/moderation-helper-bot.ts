// (c) 2026 Meta Games LLC. All rights reserved.

import {
	ChannelBotClient,
	CommandRouter,
	DEFAULT_ROUTER_SUBSCRIBED_EVENTS,
	GuildPermissions,
} from "../src/index";

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
		subscribedEvents: [
			...DEFAULT_ROUTER_SUBSCRIBED_EVENTS,
			"guildBot.memberJoin",
			"guildBot.memberLeave",
			"guildBot.memberTimeout",
		],
	});

	const router = new CommandRouter()
		.command(
			"warn",
			async (ctx) => {
				if (
					!ctx.canManageMembers() &&
					!ctx.hasAnyPermission([
						GuildPermissions.ADMINISTRATOR,
						GuildPermissions.MANAGE_MEMBERS,
					])
				) {
					await ctx.reply("You do not have permission to warn members.");
					return;
				}

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
			},
			{
				description: "Issue a warning to a member",
				options: [
					{ name: "username", required: true, description: "Target username" },
					{ name: "reason", required: false, description: "Warning reason" },
				],
			},
		)
		.command(
			"timeout",
			async (ctx) => {
				if (
					!ctx.canManageMembers() &&
					!ctx.hasAnyPermission([
						GuildPermissions.ADMINISTRATOR,
						GuildPermissions.TIMEOUT_MEMBERS,
					])
				) {
					await ctx.reply("You do not have permission to timeout members.");
					return;
				}

				const targetUserId = ctx.args[0];
				const minutes = Math.max(1, Number(ctx.args[1] || "10"));
				if (!targetUserId) {
					await ctx.reply("Usage: /timeout <userId> [minutes]");
					return;
				}
				await ctx.timeoutMember(targetUserId, minutes);
				await ctx.followUp(
					`Timed out ${targetUserId} for ${minutes} minute(s).`,
				);
			},
			{
				description: "Timeout a guild member",
				options: [
					{ name: "userId", required: true, description: "Target user id" },
					{
						name: "minutes",
						required: false,
						description: "Duration in minutes",
					},
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
