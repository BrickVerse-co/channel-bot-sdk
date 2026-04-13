# Quick Start

## 1. Create a bot in Brickverse

Create a guild bot in the Brickverse dashboard and copy its token.

## 2. Initialize the client

```ts
import {
	ChannelBotClient,
	CommandRouter,
	DEFAULT_ROUTER_SUBSCRIBED_EVENTS,
} from "@metagames/channel-bot-sdk";

const client = new ChannelBotClient({
	token: process.env.BOT_TOKEN!,
	apiBaseUrl: "https://api.brickverse.gg",
	autoRegisterCommands: true,
	subscribedEvents: DEFAULT_ROUTER_SUBSCRIBED_EVENTS,
});

const router = new CommandRouter().command(
	"ping",
	async (ctx) => {
		await ctx.replyMention("pong");
	},
	{ description: "Health check" },
);

client.useCommandRouter(router);
```

`DEFAULT_ROUTER_SUBSCRIBED_EVENTS` includes events needed for slash command bots:

- `guildBot.interactionCreate` (required so command handlers run)
- `guildBot.installationCreate` and `guildBot.installationDelete` (recommended for install/uninstall lifecycle)

You can add more subscriptions later based on your bot features.

## 3. Listen to events

```ts
client.on("guildBot.ready", (event) => {
	console.log("ready", event.bot.id);
});

client.on("guildBot.messageCreate", (event) => {
	console.log(event.message.content);
});

client.on("guildBot.installationCreate", (event) => {
	console.log(`Installed in ${event.guildName} (${event.guildId})`);
});

client.on("guildBot.installationDelete", (event) => {
	console.log(`Uninstalled from ${event.guildName} (${event.guildId})`);
});
```

## 4. Connect

```ts
await client.connect();
```

## 5. Send messages manually

```ts
await client.sendMessage({
	guildId: "123",
	channelId: "456",
	content: "Hello from SDK",
});
```
