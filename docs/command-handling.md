# Command Handling

Use `CommandRouter` for slash-command-like interaction dispatch.

## Register commands

```ts
import { CommandRouter } from "@metagames/channel-bot-sdk";

const router = new CommandRouter()
	.command(
		"ping",
		async (ctx) => {
			await ctx.replyMention("pong");
		},
		{ description: "Health check" },
	)
	.command(
		"help",
		async (ctx) => {
			await ctx.replyEmbed({
				title: "Commands",
				description: "Available commands for this bot",
				fields: [
					{ name: "ping", value: "Health check" },
					{ name: "help", value: "Show this help" },
				],
			});
		},
		{ description: "Show command help" },
	);
```

## Attach router

```ts
client.useCommandRouter(router);
await client.connect();
```

The SDK automatically calls `createSlashCommand()` for missing commands on connect when a router is attached.

Use client options to control it:

```ts
const client = new ChannelBotClient({
	token: process.env.BOT_TOKEN!,
	apiBaseUrl: "https://api.brickverse.gg",
	autoRegisterCommands: true,
	pruneMissingCommands: false,
});
```

## Context

Each handler receives a `CommandContext` with:

- `ctx.guildId`
- `ctx.channelId`
- `ctx.commandName`
- `ctx.args`
- `ctx.user`
- `ctx.reply(...)`
- `ctx.replyMention(...)`
- `ctx.replyEmbed(...)`
- `ctx.followUp(...)`
- `ctx.timeoutMember(userId, minutes)`
- `ctx.clearMemberTimeout(userId)`
- `ctx.hasPermission(permission)`
- `ctx.hasAnyPermission(permissions)`
- `ctx.hasAllPermissions(permissions)`
- `ctx.canManageMembers()`

## Permission checks

```ts
import { GuildPermissions } from "@metagames/channel-bot-sdk";

const router = new CommandRouter().command("kick", async (ctx) => {
	if (
		!ctx.canManageMembers() &&
		!ctx.hasAnyPermission([
			GuildPermissions.ADMINISTRATOR,
			GuildPermissions.KICK_MEMBERS,
		])
	) {
		await ctx.reply("You do not have permission to use this command.");
		return;
	}

	await ctx.reply("Permission check passed.");
});
```
