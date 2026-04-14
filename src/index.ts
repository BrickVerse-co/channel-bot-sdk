// (c) 2026 Meta Games LLC. All rights reserved.

export { ChannelBotClient } from "./client";

export {
	GuildPermissions,
	hasPermission,
	hasAnyPermission,
	hasAllPermissions,
	parsePermissions,
} from "./permissions";

export type { GuildPermission } from "./permissions";

export {
	CommandContext,
	CommandRouter,
	messageInputFromInteraction,
} from "./commands";

export {
	GUILD_BOT_SUBSCRIBABLE_EVENTS,
	DEFAULT_ROUTER_SUBSCRIBED_EVENTS,
} from "./types";

export type {
	ChannelBotClientOptions,
	ChannelBotEmbed,
	ChannelBotEmbedField,
	ChannelBotMessage,
	ChannelBotMessageInput,
	GuildBotSlashCommand,
	GuildBotSlashCommandOption,
	GuildBotInteraction,
	GuildBotInteractionType,
	GuildBotInstallationEvent,
	GuildBotMemberEvent,
	GuildBotMemberTimeoutResponse,
	GuildBotCommandErrorEvent,
	GuildBotDisconnectedEvent,
	ChannelBotEventMap,
	ChannelBotEventAliasMap,
	ChannelBotWebSocketState,
	GuildBotMeResponse,
	GuildBotSocketEvent,
	GuildBotSubscribableEvent,
} from "./types";
