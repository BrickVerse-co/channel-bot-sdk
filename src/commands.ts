// (c) 2026 Meta Games LLC. All rights reserved.

import type {
	ChannelBotEmbed,
	ChannelBotMessage,
	ChannelBotMessageInput,
	GuildBotInteraction,
	GuildBotInteractionType,
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

type CommandResponseData = {
	content?: string;
	embeds?: ChannelBotEmbed[];
	ephemeral?: boolean;
};

function normalizeCommandResponseInput(
	input: string | CommandResponseData,
	options?: { ephemeral?: boolean },
): CommandResponseData {
	if (typeof input === "string") {
		return {
			content: input,
			ephemeral: options?.ephemeral === true,
		};
	}

	return {
		content: input.content,
		embeds: input.embeds,
		ephemeral: options?.ephemeral === true || input.ephemeral === true,
	};
}

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

	get interactionType(): GuildBotInteractionType {
		return this.interaction.interactionType || "SLASH_COMMAND";
	}

	get buttonId() {
		return this.interaction.buttonId;
	}

	get selectId() {
		return this.interaction.selectId;
	}

	get selectedValues() {
		return this.interaction.selectedValues || [];
	}

	get modalId() {
		return this.interaction.modalId;
	}

	get modalValues() {
		return this.interaction.modalValues || {};
	}

	isSlashCommand() {
		return this.interactionType === "SLASH_COMMAND";
	}

	isButtonInteraction() {
		return this.interactionType === "BUTTON";
	}

	isSelectMenuInteraction() {
		return this.interactionType === "SELECT_MENU";
	}

	isModalSubmitInteraction() {
		return this.interactionType === "MODAL_SUBMIT";
	}

	get args() {
		return this.interaction.arguments;
	}

	get user() {
		return this.interaction.user;
	}

	reply(
		input: string,
		options?: { ephemeral?: boolean },
	): ReturnType<ChannelBotClient["sendMessage"]>;
	reply(
		input: CommandResponseData,
	): ReturnType<ChannelBotClient["sendMessage"]>;
	reply(
		input: string | CommandResponseData,
		options?: { ephemeral?: boolean },
	) {
		const payload = normalizeCommandResponseInput(input, options);
		return this.client.sendMessage({
			guildId: this.guildId,
			channelId: this.channelId,
			content: payload.content,
			embeds: payload.embeds,
			ephemeralForUserId: payload.ephemeral ? this.user.id : undefined,
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

	followUp(
		input: string,
		options?: { ephemeral?: boolean },
	): ReturnType<ChannelBotClient["sendFollowUp"]>;
	followUp(
		input: CommandResponseData,
	): ReturnType<ChannelBotClient["sendFollowUp"]>;
	followUp(
		input: string | CommandResponseData,
		options?: { ephemeral?: boolean },
	) {
		const payload = normalizeCommandResponseInput(input, options);
		return this.client.sendFollowUp({
			guildId: this.guildId,
			channelId: this.channelId,
			interactionId: this.interaction.interactionId,
			content: payload.content,
			embeds: payload.embeds,
			ephemeralForUserId: payload.ephemeral ? this.user.id : undefined,
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

	private registerHandler(rawKey: string, handler: CommandHandler): string {
		const normalized = rawKey.trim().toLowerCase();
		if (!normalized) throw new Error("Command name is required");
		if (this.handlers.has(normalized)) {
			console.warn(`Overwriting existing command handler for ${normalized}`);
		}
		this.handlers.set(normalized, handler);
		return normalized;
	}

	command(
		name: string,
		handler: CommandHandler,
		metadata?: {
			description?: string;
			options?: GuildBotSlashCommandOption[];
		},
	): this {
		const normalized = this.registerHandler(name, handler);

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

	button(id: string, handler: CommandHandler): this {
		this.registerHandler(`button:${id}`, handler);
		return this;
	}

	selectMenu(id: string, handler: CommandHandler): this {
		this.registerHandler(`select:${id}`, handler);
		return this;
	}

	modal(id: string, handler: CommandHandler): this {
		this.registerHandler(`modal:${id}`, handler);
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
		followUp: input.followUp,
		followUpToInteractionId: input.followUpToInteractionId,
		ephemeralForUserId: input.ephemeralForUserId,
	};
}
