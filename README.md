# Brickverse Channel Bot SDK

TypeScript SDK for building Brickverse guild channel bots.

## What is included

- WebSocket gateway client for bot events
- Bot runtime REST helpers for sending/editing/deleting messages
- Command router with convenience reply helpers
- Typed event payloads
- Examples and docs

## Creating a Bot Account

A BrickVerse.gg bot account is required, you can create one for free at https://brickverse.gg/my/guild-bots.

### Getting your bot verified

Verifications are issued at the discretion of BrickVerse automatically, we only grant verification checkmark to tools being popularly used in large amount of guilds, official partnerships, etc.

## Install

```bash
npm i @metagames/channel-bot-sdk
```

## Quick Example

```ts
import {
	ChannelBotClient,
	CommandRouter,
	DEFAULT_ROUTER_SUBSCRIBED_EVENTS,
} from "@metagames/channel-bot-sdk";

const client = new ChannelBotClient({
	token: process.env.BOT_TOKEN!,
	apiBaseUrl: "https://api.brickverse.gg",
	subscribedEvents: DEFAULT_ROUTER_SUBSCRIBED_EVENTS,
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
	console.log(`Logged in as ${event.bot.username}`);
});

await client.connect();
```

## Event Subscriptions (Required vs Optional)

The gateway supports filtered subscriptions. You choose which events your bot receives with `subscribedEvents`.

- Required for slash command handling: `guildBot.interactionCreate`
- Strongly recommended operational defaults: `guildBot.installationCreate`, `guildBot.installationDelete`

These three defaults are exported as `DEFAULT_ROUTER_SUBSCRIBED_EVENTS` and are used in SDK examples. If you use `CommandRouter`, the SDK also auto-adds these defaults so command handling keeps working.

Add more events only when your bot needs them (for example, member moderation or message analytics) to reduce gateway traffic and simplify handlers.

## Permission-Aware Events

Interaction and message events now include guild permission context for users.

- `event.interaction.user.permissions` (string bitfield)
- `event.interaction.user.rankLevel`
- `event.interaction.user.isPlatformAdmin`
- `event.interaction.user.isGuildOwner`
- `event.interaction.user.isGuildAdmin`

You can use SDK helpers to check permissions:

```ts
import { GuildPermissions, hasAnyPermission } from "@metagames/channel-bot-sdk";

client.on("guildBot.interactionCreate", async (event) => {
	if (
		event.interaction.user.isPlatformAdmin ||
		hasAnyPermission(event.interaction.user.permissions, [
			GuildPermissions.ADMINISTRATOR,
			GuildPermissions.MANAGE_MEMBERS,
		])
	) {
		console.log("User can manage members");
	}
});
```

## Command Reply Helpers

The command handler receives a `CommandContext` with:

- `ctx.reply("text")`
- `ctx.reply({ content, embeds })`
- `ctx.reply("text", { ephemeral: true })`
- `ctx.reply({ content, embeds, ephemeral: true })`
- `ctx.replyMention("text")`
- `ctx.replyEmbed(embed, optionalContent)`
- `ctx.followUp("text")`
- `ctx.followUp("text", { ephemeral: true })`
- `ctx.timeoutMember(userId, durationMinutes)`
- `ctx.clearMemberTimeout(userId)`
- `ctx.hasPermission(permission)`
- `ctx.hasAnyPermission(permissions)`
- `ctx.hasAllPermissions(permissions)`
- `ctx.canManageMembers()`

## Automatic Slash Command Registration

When you use `CommandRouter`, the SDK now auto-registers missing slash commands on connect by calling `createSlashCommand()` for each router command.

```ts
const client = new ChannelBotClient({
	token: process.env.BOT_TOKEN!,
	apiBaseUrl: "https://api.brickverse.gg",
	autoRegisterCommands: true, // default true
	pruneMissingCommands: false, // default false
	subscribedEvents: DEFAULT_ROUTER_SUBSCRIBED_EVENTS,
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
		"timeout",
		async (ctx) => {
			const userId = ctx.args[0];
			const minutes = Number(ctx.args[1] || "10");
			if (!userId) {
				await ctx.reply("Usage: /timeout <userId> [minutes]");
				return;
			}
			await ctx.timeoutMember(userId, Math.max(1, minutes));
			await ctx.followUp(`Timed out ${userId} for ${Math.max(1, minutes)}m`);
		},
		{
			description: "Timeout a guild member",
			options: [
				{
					name: "userId",
					required: true,
					description: "Target member user id",
				},
				{
					name: "minutes",
					required: false,
					description: "Duration in minutes",
				},
			],
		},
	);

client.useCommandRouter(router);
await client.connect();
```

## API Surface

- `client.connect()`
- `client.login()` (alias of `connect`)
- `client.disconnect()`
- `client.destroy()` (alias of `disconnect`)
- `client.on(eventName, listener)`
- `client.once(eventName, listener)`
- `client.onAlias(eventName, listener)`
- `client.onReady(listener)` / `client.onClose(listener)`
- `client.onMessageCreate(listener)` / `client.onInteractionCreate(listener)`
- `client.onGuildCreate(listener)` / `client.onGuildDelete(listener)`
- `client.onCommandError(listener)`
- `client.isReady()` / `client.isConnected()`
- `client.getWebSocketReadyState()` / `client.getWebSocketState()`
- `client.getSubscribedEvents()`
- `client.setSubscribedEvents(events)`
- `client.addSubscribedEvents(events)`
- `client.getMe()`
- `client.sendMessage({ guildId, channelId, content, embeds })`
- `client.sendEmbed({ guildId, channelId, embed, content })`
- `client.editMessage(messageId, { content, embeds })`
- `client.deleteMessage(messageId)`
- `client.createSlashCommand({ name, description, options })`
- `client.deleteSlashCommand(commandId)`
- `client.syncCommandRouterSlashCommands()`
- `client.timeoutMember({ guildId, userId, durationMinutes })`
- `client.clearMemberTimeout({ guildId, userId })`
- `client.timeout(guildId, userId, durationMinutes)`
- `client.removeTimeout(guildId, userId)`

## Installation Lifecycle Events

```ts
client.on("guildBot.installationCreate", (event) => {
	console.log(
		`Installed in ${event.guildName} (${event.guildId}) with ${event.permissions}`,
	);
});

client.on("guildBot.installationDelete", (event) => {
	console.log(`Uninstalled from ${event.guildName} (${event.guildId})`);
});

// discord.js-style aliases are also available:
client.on("guildCreate", (event) => {
	console.log(`Installed in ${event.guildName} (${event.guildId})`);
});

client.once("ready", () => {
	console.log("Gateway ready");
});
```

## Docs

- [Quick Start](docs/quick-start.md)
- [Events](docs/events.md)
- [Command Handling](docs/command-handling.md)

## Examples

- [Echo Bot](examples/echo-bot.ts)
- [Moderation Helper Bot](examples/moderation-helper-bot.ts)
