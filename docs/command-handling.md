# Command Handling

Use `CommandRouter` for slash-command-like interaction dispatch.

## Register commands

```ts
import { CommandRouter } from "@metagames/channel-bot-sdk";

const router = new CommandRouter()
	.command("ping", async (ctx) => {
		await ctx.replyMention("pong");
	})
	.command("help", async (ctx) => {
		await ctx.replyEmbed({
			title: "Commands",
			description: "Available commands for this bot",
			fields: [
				{ name: "ping", value: "Health check" },
				{ name: "help", value: "Show this help" },
			],
		});
	});
```

## Attach router

```ts
client.useCommandRouter(router);
await client.connect();
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
