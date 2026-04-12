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

## Utility events

- `raw` (all parsed gateway payloads)
- `disconnected`
- `guildBot.commandError` (when command router handler throws)

## Example

```ts
client.on("guildBot.interactionCreate", async (event) => {
	console.log(event.interaction.commandName);
});
```
