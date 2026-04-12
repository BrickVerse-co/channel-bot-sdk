# Quick Start

## 1. Create a bot in Brickverse

Create a guild bot in the Brickverse dashboard and copy its token.

## 2. Initialize the client

```ts
import { ChannelBotClient } from "@metagames/channel-bot-sdk";

const client = new ChannelBotClient({
	token: process.env.BOT_TOKEN!,
	apiBaseUrl: "https://api.brickverse.gg",
});
```

## 3. Listen to events

```ts
client.on("guildBot.ready", (event) => {
	console.log("ready", event.bot.id);
});

client.on("guildBot.messageCreate", (event) => {
	console.log(event.message.content);
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
