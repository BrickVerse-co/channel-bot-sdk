# Events

All events are available through `client.on(eventName, listener)`.

## Subscription model

Use `subscribedEvents` in `ChannelBotClient` to choose which gateway events your bot receives.

Use `DEFAULT_ROUTER_SUBSCRIBED_EVENTS` for slash-command bots. It includes:

- `guildBot.interactionCreate` (required for command routing)
- `guildBot.installationCreate` and `guildBot.installationDelete` (recommended lifecycle defaults)

You can change subscriptions later using:

- `client.setSubscribedEvents(events)`
- `client.addSubscribedEvents(events)`
- `client.getSubscribedEvents()`

## Gateway events

- `guildBot.ready`
- `guildBot.error`
- `guildBot.messageCreate`
- `guildBot.messageUpdate`
- `guildBot.messageDelete`
- `guildBot.reactionUpdate`
- `guildBot.interactionCreate`
- `guildBot.installationCreate`
- `guildBot.installationDelete`
- `guildBot.memberJoin`
- `guildBot.memberLeave`
- `guildBot.memberKick`
- `guildBot.memberBan`
- `guildBot.memberTimeout`
- `guildBot.memberRankUpdate`
- `guildBot.auditLogCreate`

## Utility events

- `raw` (all parsed gateway payloads)
- `disconnected`
- `guildBot.commandError` (when command router handler throws)

## Discord.js-style aliases

The SDK also emits aliases that map to gateway events:

- `ready` -> `guildBot.ready`
- `error` -> `guildBot.error`
- `messageCreate` -> `guildBot.messageCreate`
- `messageUpdate` -> `guildBot.messageUpdate`
- `messageDelete` -> `guildBot.messageDelete`
- `reactionUpdate` -> `guildBot.reactionUpdate`
- `interactionCreate` -> `guildBot.interactionCreate`
- `guildCreate` -> `guildBot.installationCreate`
- `guildDelete` -> `guildBot.installationDelete`
- `memberAdd` -> `guildBot.memberJoin`
- `memberRemove` -> `guildBot.memberLeave`
- `memberKick` -> `guildBot.memberKick`
- `memberBan` -> `guildBot.memberBan`
- `memberTimeout` -> `guildBot.memberTimeout`
- `memberRankUpdate` -> `guildBot.memberRankUpdate`
- `auditLogCreate` -> `guildBot.auditLogCreate`
- `commandError` -> `guildBot.commandError`
- `close` -> `disconnected`

## Example

```ts
client.on("guildBot.interactionCreate", async (event) => {
	console.log(event.interaction.commandName);
});

client.on("guildBot.installationCreate", (event) => {
	console.log(`Installed in ${event.guildName} (${event.guildId})`);
});

client.on("guildBot.installationDelete", (event) => {
	console.log(`Uninstalled from ${event.guildName} (${event.guildId})`);
});
```
