# Events

All events are available through `client.on(eventName, listener)`.

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

## Utility events

- `raw` (all parsed gateway payloads)
- `disconnected`
- `guildBot.commandError` (when command router handler throws)

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
