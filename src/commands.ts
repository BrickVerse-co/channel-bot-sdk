// (c) 2026 Meta Games LLC. All rights reserved.

import type {
	ChannelBotEmbed,
	ChannelBotMessage,
	ChannelBotMessageInput,
	GuildBotInteraction,
	GuildBotSlashCommandOption,
	GuildBotSocketEvent,
} from "./types";
import type { ChannelBotClient } from "./client";
import {
	hasAllPermissions,
	hasAnyPermission,
	hasPermission,
} from "./permissions";
import type { GuildPermission } from "./permissions";

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

	followUp(input: string | { content?: string; embeds?: ChannelBotEmbed[] }) {
		if (typeof input === "string") {
			return this.client.sendFollowUp({
				guildId: this.guildId,
				channelId: this.channelId,
				interactionId: this.interaction.interactionId,
				content: input,
			});
		}

		return this.client.sendFollowUp({
			guildId: this.guildId,
			channelId: this.channelId,
			interactionId: this.interaction.interactionId,
			content: input.content,
			embeds: input.embeds,
		});
	}

	replyEphemeral(
		input: string | { content?: string; embeds?: ChannelBotEmbed[] },
	) {
		if (typeof input === "string") {
			return this.client.sendEphemeralMessage({
				guildId: this.guildId,
				channelId: this.channelId,
				userId: this.user.id,
				content: input,
			});
		}

		return this.client.sendEphemeralMessage({
			guildId: this.guildId,
			channelId: this.channelId,
			userId: this.user.id,
			content: input.content,
			embeds: input.embeds,
		});
	}

	followUpEphemeral(
		input: string | { content?: string; embeds?: ChannelBotEmbed[] },
	) {
		if (typeof input === "string") {
			return this.client.sendFollowUp({
				guildId: this.guildId,
				channelId: this.channelId,
				interactionId: this.interaction.interactionId,
				content: input,
				ephemeralForUserId: this.user.id,
			});
		}

		return this.client.sendFollowUp({
			guildId: this.guildId,
			channelId: this.channelId,
			interactionId: this.interaction.interactionId,
			content: input.content,
			embeds: input.embeds,
			ephemeralForUserId: this.user.id,
		});
	}

	timeoutMember(userId: string, durationMinutes: number) {
		return this.client.timeoutMember({
			guildId: this.guildId,
			userId,
			durationMinutes,
		});
	}

	clearMemberTimeout(userId: string) {
		return this.client.clearMemberTimeout({
			guildId: this.guildId,
			userId,
		});
	}

	hasPermission(permission: GuildPermission) {
		return hasPermission(this.user.permissions, permission);
	}

	hasAnyPermission(permissions: GuildPermission[]) {
		return hasAnyPermission(this.user.permissions, permissions);
	}

	hasAllPermissions(permissions: GuildPermission[]) {
		return hasAllPermissions(this.user.permissions, permissions);
	}

	canManageMembers() {
		return (
			this.user.isPlatformAdmin === true ||
			this.user.isGuildOwner === true ||
			this.user.isGuildAdmin === true
		);
	}
}

export type CommandHandler = (
	ctx: CommandContext,
) => Promise<unknown> | unknown;

export type CommandRegistration = {
	name: string;
	description: string;
	options?: GuildBotSlashCommandOption[];
};

export class CommandRouter {
	private readonly handlers = new Map<string, CommandHandler>();
	private readonly registrations = new Map<string, CommandRegistration>();

	command(
		name: string,
		handler: CommandHandler,
		metadata?: {
			description?: string;
			options?: GuildBotSlashCommandOption[];
		},
	): this {
		const normalized = name.trim().toLowerCase();
		if (!normalized) throw new Error("Command name is required");
		if (this.handlers.has(normalized)) {
			console.warn(`Overwriting existing command handler for /${normalized}`);
		}

		this.handlers.set(normalized, handler);

		this.registrations.set(normalized, {
			name: normalized,
			description:
				metadata?.description?.trim() ||
				`Auto-registered command /${normalized}`,
			options:
				Array.isArray(metadata?.options) && metadata?.options.length > 0
					? metadata.options
					: undefined,
		});

		return this;
	}

	remove(name: string): this {
		const normalized = name.trim().toLowerCase();
		this.handlers.delete(normalized);
		this.registrations.delete(normalized);
		return this;
	}

	getCommandRegistrations(): CommandRegistration[] {
		return [...this.registrations.values()];
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
