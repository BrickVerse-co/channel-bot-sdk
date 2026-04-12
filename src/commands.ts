// (c) 2026 Meta Games LLC. All rights reserved.

import type {
	ChannelBotEmbed,
	ChannelBotMessage,
	ChannelBotMessageInput,
	GuildBotInteraction,
	GuildBotSocketEvent,
} from "./types";
import type { ChannelBotClient } from "./client";

export class CommandContext {
	readonly client: ChannelBotClient;
	readonly guildId: string;
	readonly channelId: string;
	readonly interaction: GuildBotInteraction;

	constructor(args: {
		client: ChannelBotClient;
		guildId: string;
		channelId: string;
		interaction: GuildBotInteraction;
	}) {
		this.client = args.client;
		this.guildId = args.guildId;
		this.channelId = args.channelId;
		this.interaction = args.interaction;
	}

	get commandName() {
		return this.interaction.commandName;
	}

	get args() {
		return this.interaction.arguments;
	}

	get user() {
		return this.interaction.user;
	}

	reply(input: string | { content?: string; embeds?: ChannelBotEmbed[] }) {
		if (typeof input === "string") {
			return this.client.sendMessage({
				guildId: this.guildId,
				channelId: this.channelId,
				content: input,
			});
		}

		return this.client.sendMessage({
			guildId: this.guildId,
			channelId: this.channelId,
			content: input.content,
			embeds: input.embeds,
		});
	}

	replyMention(content: string) {
		return this.reply(`@${this.user.username} ${content}`);
	}

	replyEmbed(embed: ChannelBotEmbed, content?: string) {
		return this.reply({
			content,
			embeds: [embed],
		});
	}
}

export type CommandHandler = (
	ctx: CommandContext,
) => Promise<unknown> | unknown;

export class CommandRouter {
	private readonly handlers = new Map<string, CommandHandler>();

	command(name: string, handler: CommandHandler): this {
		const normalized = name.trim().toLowerCase();
		if (!normalized) throw new Error("Command name is required");
		this.handlers.set(normalized, handler);
		return this;
	}

	remove(name: string): this {
		this.handlers.delete(name.trim().toLowerCase());
		return this;
	}

	async handle(
		event: Extract<GuildBotSocketEvent, { type: "guildBot.interactionCreate" }>,
		client: ChannelBotClient,
	) {
		const handler = this.handlers.get(
			event.interaction.commandName.toLowerCase(),
		);
		if (!handler) return false;

		await handler(
			new CommandContext({
				client,
				guildId: event.guildId,
				channelId: event.channelId,
				interaction: event.interaction,
			}),
		);
		return true;
	}
}

export type ChannelBotMessageResponse = {
	success: boolean;
	message: ChannelBotMessage;
};

export function messageInputFromInteraction(
	event: Extract<GuildBotSocketEvent, { type: "guildBot.interactionCreate" }>,
	input: Omit<ChannelBotMessageInput, "guildId" | "channelId">,
): ChannelBotMessageInput {
	return {
		guildId: event.guildId,
		channelId: event.channelId,
		content: input.content,
		embeds: input.embeds,
	};
}
