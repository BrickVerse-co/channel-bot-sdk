// (c) 2026 Meta Games LLC. All rights reserved.

export type ChannelBotEmbedField = {
	name: string;
	value: string;
	inline?: boolean;
};

export type ChannelBotEmbed = {
	title?: string;
	description?: string;
	url?: string;
	color?: string;
	footer?: string;
	fields?: ChannelBotEmbedField[];
};

export type ChannelBotMessage = {
	id: string;
	content: string;
	ephemeralForUserId?: string;
	followUpToInteractionId?: string;
	isFollowUp?: boolean;
	embeds?: ChannelBotEmbed[] | null;
	isPinned?: boolean;
	createdAt: string;
	updatedAt: string;
	edited?: boolean;
	reactions?: Array<{
		emoji: string;
		count: number;
		reactedByMe: boolean;
	}>;
	sender: {
		id: string;
		username: string;
		permissions?: string;
		isPlatformAdmin?: boolean;
		isGuildOwner?: boolean;
		isGuildAdmin?: boolean;
		rank?: {
			id: string;
			name: string;
			rankLevel: number;
			color?: string | null;
			permissions?: string;
		} | null;
	};
};

export type GuildBotInteraction = {
	interactionId: string;
	commandName: string;
	rawInput: string;
	arguments: string[];
	user: {
		id: string;
		username: string;
		permissions?: string;
		rankLevel?: number;
		isPlatformAdmin?: boolean;
		isGuildOwner?: boolean;
		isGuildAdmin?: boolean;
	};
};

export type GuildBotInstallationEvent = {
	type: "guildBot.installationCreate" | "guildBot.installationDelete";
	guildId: string;
	guildName: string;
	permissions?: string;
	installedByUserId?: string;
	uninstalledByUserId?: string;
};

export type GuildBotMemberEvent =
	| {
			type: "guildBot.memberJoin" | "guildBot.memberLeave";
			guildId: string;
			userId: string;
			reason?: string;
	  }
	| {
			type: "guildBot.memberKick";
			guildId: string;
			userId: string;
			actorUserId?: string;
			reason?: string;
	  }
	| {
			type: "guildBot.memberBan";
			guildId: string;
			userId: string;
			actorUserId?: string;
			reason?: string;
			expiresAt?: string | null;
	  }
	| {
			type: "guildBot.memberTimeout";
			guildId: string;
			userId: string;
			actorUserId?: string;
			timeoutUntil: string | null;
			reason?: string;
	  }
	| {
			type: "guildBot.memberRankUpdate";
			guildId: string;
			userId: string;
			actorUserId?: string;
			fromRankId?: string | null;
			toRankId: string;
	  };

export type GuildBotMemberTimeoutResponse = {
	success: boolean;
	timeoutUntil?: string;
	message?: string;
};

export type GuildBotSocketEvent =
	| {
			type: "guildBot.ready";
			bot: { id: string; username: string; description: string | null };
	  }
	| {
			type: "guildBot.error";
			message: string;
			requestId?: string;
	  }
	| {
			type: "guildBot.subscriptionsUpdated";
			events: string[];
	  }
	| {
			type: "guildBot.messageCreate";

			guildId: string;
			channelId: string;
			message: ChannelBotMessage;
	  }
	| {
			type: "guildBot.messageUpdate";
			guildId: string;
			channelId: string;
			message: ChannelBotMessage;
	  }
	| {
			type: "guildBot.messageDelete";
			guildId: string;
			channelId: string;
			messageId: string;
	  }
	| {
			type: "guildBot.reactionUpdate";
			guildId: string;
			channelId: string;
			messageId: string;
			reactions: Array<{
				emoji: string;
				count: number;
				reactedByMe: boolean;
			}>;
	  }
	| {
			type: "guildBot.interactionCreate";
			guildId: string;
			channelId: string;
			interaction: GuildBotInteraction;
	  }
	| {
			type: "guildBot.installationCreate";
			guildId: string;
			guildName: string;
			permissions: string;
			installedByUserId: string;
	  }
	| {
			type: "guildBot.installationDelete";
			guildId: string;
			guildName: string;
			uninstalledByUserId: string;
	  }
	| GuildBotMemberEvent
	| {
			type: "guildBot.auditLogCreate";
			guildId: string;
			auditLog: {
				id: string;
				action: string;
				userId?: string | null;
				details?: unknown;
				createdAt?: string;
			};
	  };

export const GUILD_BOT_SUBSCRIBABLE_EVENTS = [
	"guildBot.messageCreate",
	"guildBot.messageUpdate",
	"guildBot.messageDelete",
	"guildBot.reactionUpdate",
	"guildBot.interactionCreate",
	"guildBot.installationCreate",
	"guildBot.installationDelete",
	"guildBot.memberJoin",
	"guildBot.memberLeave",
	"guildBot.memberKick",
	"guildBot.memberBan",
	"guildBot.memberTimeout",
	"guildBot.memberRankUpdate",
	"guildBot.auditLogCreate",
] as const;

export type GuildBotSubscribableEvent =
	(typeof GUILD_BOT_SUBSCRIBABLE_EVENTS)[number];

export const DEFAULT_ROUTER_SUBSCRIBED_EVENTS: GuildBotSubscribableEvent[] = [
	"guildBot.interactionCreate",
	"guildBot.installationCreate",
	"guildBot.installationDelete",
];

export type GuildBotCommandErrorEvent = {
	type: "guildBot.commandError";
	error: unknown;
	event: Extract<GuildBotSocketEvent, { type: "guildBot.interactionCreate" }>;
};

export type GuildBotDisconnectedEvent = {
	type: "disconnected";
};

export type ChannelBotEventMap = {
	raw: GuildBotSocketEvent;
	disconnected: GuildBotDisconnectedEvent;
	"guildBot.commandError": GuildBotCommandErrorEvent;
} & {
	[K in GuildBotSocketEvent["type"]]: Extract<GuildBotSocketEvent, { type: K }>;
};

export type GuildBotMeResponse = {
	success: boolean;
	bot: {
		id: string;
		username: string;
		description: string | null;
		isPublic?: boolean;
		logoId: string | null;
		creatorId: string;
		creatorType: string;
	};
	installations: Array<{
		guildId: string;
		guildName: string;
		permissions?: string;
	}>;
	commands: Array<{
		id: string;
		name: string;
		description: string;
		options?: unknown;
	}>;
};

export type GuildBotSlashCommandOption = {
	type?: string;
	name: string;
	description?: string;
	required?: boolean;
};

export type GuildBotSlashCommand = {
	id: string;
	name: string;
	description: string;
	options?: unknown;
};

export type ChannelBotClientOptions = {
	token: string;
	apiBaseUrl: string;
	websocketUrl?: string;
	fetchImpl?: typeof fetch;
	WebSocketImpl?: typeof WebSocket;
	autoReconnect?: boolean;
	reconnectDelayMs?: number;
	autoRegisterCommands?: boolean;
	pruneMissingCommands?: boolean;
	subscribedEvents?: GuildBotSubscribableEvent[];
};

export type ChannelBotMessageInput = {
	guildId: string;
	channelId: string;
	content?: string;
	embeds?: ChannelBotEmbed[];
	followUp?: boolean;
	followUpToInteractionId?: string;
	ephemeralForUserId?: string;
};
