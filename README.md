# Brickverse Channel Bot SDK

TypeScript SDK for building Brickverse guild channel bots.

## What is included

- WebSocket gateway client for bot events
- Bot runtime REST helpers for sending/editing/deleting messages
- Command router with convenience reply helpers
- Typed event payloads
- Examples and docs

## Install

```bash
npm i @metagames/channel-bot-sdk
```

## Quick Example

```ts
import { ChannelBotClient, CommandRouter } from "@metagames/channel-bot-sdk";

const client = new ChannelBotClient({
	token: process.env.BOT_TOKEN!,
	apiBaseUrl: "https://api.brickverse.gg",
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

## Command Reply Helpers

The command handler receives a `CommandContext` with:

- `ctx.reply("text")`
- `ctx.reply({ content, embeds })`
- `ctx.replyMention("text")`
- `ctx.replyEmbed(embed, optionalContent)`

## API Surface

- `client.connect()`
- `client.disconnect()`
- `client.on(eventName, listener)`
- `client.getMe()`
- `client.sendMessage({ guildId, channelId, content, embeds })`
- `client.sendEmbed({ guildId, channelId, embed, content })`
- `client.editMessage(messageId, { content, embeds })`
- `client.deleteMessage(messageId)`
- `client.createSlashCommand({ name, description, options })`
- `client.deleteSlashCommand(commandId)`

## Docs

- [Quick Start](docs/quick-start.md)
- [Events](docs/events.md)
- [Command Handling](docs/command-handling.md)

## Examples

- [Echo Bot](examples/echo-bot.ts)
- [Moderation Helper Bot](examples/moderation-helper-bot.ts)
