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
	};
};

export type GuildBotInteraction = {
	commandName: string;
	rawInput: string;
	arguments: string[];
	user: {
		id: string;
		username: string;
	};
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
	  };

export type GuildBotMeResponse = {
	success: boolean;
	bot: {
		id: string;
		username: string;
		description: string | null;
		logoId: string | null;
		creatorId: string;
		creatorType: string;
	};
	installations: Array<{ guildId: string; guildName: string }>;
	commands: Array<{
		id: string;
		name: string;
		description: string;
		options?: unknown;
	}>;
};

export type ChannelBotClientOptions = {
	token: string;
	apiBaseUrl: string;
	websocketUrl?: string;
	fetchImpl?: typeof fetch;
	WebSocketImpl?: typeof WebSocket;
	autoReconnect?: boolean;
	reconnectDelayMs?: number;
};

export type ChannelBotMessageInput = {
	guildId: string;
	channelId: string;
	content?: string;
	embeds?: ChannelBotEmbed[];
};
