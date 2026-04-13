// (c) 2026 Meta Games LLC. All rights reserved.

import { EventEmitter } from "./events";
import {
	createWebSocketUrl,
	normalizeApiBaseUrl,
	requestWithBotToken,
} from "./http";
import { CommandRouter } from "./commands";
import type {
	ChannelBotClientOptions,
	ChannelBotEmbed,
	GuildBotSlashCommand,
	GuildBotSlashCommandOption,
	ChannelBotMessage,
	ChannelBotMessageInput,
	ChannelBotEventMap,
	GuildBotMeResponse,
	GuildBotMemberTimeoutResponse,
	GuildBotSocketEvent,
} from "./types";

export class ChannelBotClient {
	private readonly token: string;
	private readonly apiBaseUrl: string;
	private readonly websocketUrl: string;
	private readonly fetchImpl: typeof fetch;
	private readonly WebSocketImpl: typeof WebSocket;
	private readonly autoReconnect: boolean;
	private readonly reconnectDelayMs: number;
	private readonly autoRegisterCommands: boolean;
	private readonly pruneMissingCommands: boolean;
	private readonly subscribedEvents: string[];
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private manuallyClosed = false;
	private ws: WebSocket | null = null;
	private readonly events = new EventEmitter();
	private commandRouter: CommandRouter | null = null;

	constructor(options: ChannelBotClientOptions) {
		if (!options.token?.trim()) {
			throw new Error("ChannelBotClient requires a bot token");
		}
		if (!options.apiBaseUrl?.trim()) {
			throw new Error("ChannelBotClient requires apiBaseUrl");
		}

		this.token = options.token.trim();
		this.apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl);
		this.websocketUrl =
			options.websocketUrl || createWebSocketUrl(this.apiBaseUrl);
		this.fetchImpl = options.fetchImpl || fetch;
		this.WebSocketImpl = options.WebSocketImpl || WebSocket;
		this.autoReconnect = options.autoReconnect !== false;
		this.reconnectDelayMs = Math.max(250, options.reconnectDelayMs || 2500);
		this.autoRegisterCommands = options.autoRegisterCommands !== false;
		this.pruneMissingCommands = options.pruneMissingCommands === true;
		this.subscribedEvents = Array.isArray(options.subscribedEvents)
			? options.subscribedEvents.filter(
					(eventName) =>
						typeof eventName === "string" && eventName.trim().length > 0,
				)
			: [];
	}

	on<K extends keyof ChannelBotEventMap>(
		eventName: K,
		listener: (event: ChannelBotEventMap[K]) => void,
	) {
		return this.events.on<ChannelBotEventMap[K]>(eventName as string, listener);
	}

	off<K extends keyof ChannelBotEventMap>(
		eventName: K,
		listener: (event: ChannelBotEventMap[K]) => void,
	) {
		return this.events.off<ChannelBotEventMap[K]>(
			eventName as string,
			listener,
		);
	}

	useCommandRouter(router: CommandRouter) {
		this.commandRouter = router;

		if (this.ws && this.ws.readyState === 1) {
			if (this.subscribedEvents.length > 0) {
				this.subscribeToEvents(this.subscribedEvents);
			}

			if (this.autoRegisterCommands) {
				void this.syncCommandRouterSlashCommands().catch(() => {});
			}
		}

		return this;
	}

	async connect(): Promise<void> {
		this.manuallyClosed = false;
		if (this.ws && this.ws.readyState <= 1) return;

		await new Promise<void>((resolve, reject) => {
			const ws = new this.WebSocketImpl(this.websocketUrl);
			this.ws = ws;

			let resolved = false;

			ws.onopen = () => {
				ws.send(
					JSON.stringify({ type: "guildBot.authenticate", token: this.token }),
				);
			};

			ws.onmessage = (rawEvent: MessageEvent) => {
				if (!rawEvent.data) return;

				let parsed: GuildBotSocketEvent;
				try {
					parsed = JSON.parse(String(rawEvent.data)) as GuildBotSocketEvent;
				} catch(err) {
					console.error("Failed to parse guild bot websocket message", err);
					return;
				}

				this.events.emit("raw", parsed);
				this.events.emit(parsed.type, parsed);

				if (
					parsed.type === "guildBot.interactionCreate" &&
					this.commandRouter
				) {
					void this.commandRouter.handle(parsed, this).catch((error) => {
						this.events.emit("guildBot.commandError", {
							type: "guildBot.commandError",
							error,
							event: parsed,
						});
					});
				}

				if (parsed.type === "guildBot.ready" && !resolved) {
					resolved = true;
					if (this.subscribedEvents.length > 0) {
						this.subscribeToEvents(this.subscribedEvents);
					}
					if (this.commandRouter && this.autoRegisterCommands) {
						void this.syncCommandRouterSlashCommands()
							.then(() => resolve())
							.catch((error) => {
								reject(
									error instanceof Error
										? error
										: new Error("Failed to sync router slash commands"),
								);
							});
					} else {
						resolve();
					}
					return;
				}

				if (parsed.type === "guildBot.error" && !resolved) {
					resolved = true;
					reject(new Error(parsed.message || "Guild bot websocket error"));
				}
			};

			ws.onerror = () => {
				if (resolved) return;
				resolved = true;
				reject(new Error("Guild bot websocket connection failed"));
			};

			ws.onclose = () => {
				this.ws = null;
				this.events.emit("disconnected", { type: "disconnected" });
				if (!this.manuallyClosed && this.autoReconnect) {
					this.scheduleReconnect();
				}
				if (!resolved) {
					resolved = true;
					reject(new Error("Guild bot websocket closed before ready"));
				}
			};
		});
	}

	private scheduleReconnect() {
		if (this.reconnectTimer) return;

		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			void this.connect().catch(() => {});
		}, this.reconnectDelayMs);
	}

	disconnect() {
		this.manuallyClosed = true;

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	subscribeToEvents(events: string[]) {
		if (!this.ws || this.ws.readyState !== 1) return;
		console.debug("Subscribing to guild bot events:", events);
		this.ws.send(
			JSON.stringify({
				type: "guildBot.subscribe",
				events,
			}),
		);
	}

	private request<T>(
		path: string,
		options: Omit<RequestInit, "body"> & { body?: unknown } = {},
	): Promise<T> {
		return requestWithBotToken<T>({
			fetchImpl: this.fetchImpl,
			apiBaseUrl: this.apiBaseUrl,
			token: this.token,
			path,
			options,
		});
	}

	getMe() {
		return this.request<GuildBotMeResponse>("/v3/social/guild-bots/@me");
	}

	async syncCommandRouterSlashCommands() {
		if (!this.commandRouter) return;

		const registrations = this.commandRouter.getCommandRegistrations();
		if (registrations.length === 0) return;

		const me = await this.getMe();
		const existingByName = new Map(
			(me.commands || []).map((command) => [
				command.name.toLowerCase(),
				command,
			]),
		);
		const desiredNames = new Set(registrations.map((entry) => entry.name));

		for (const registration of registrations) {
			if (existingByName.has(registration.name)) continue;
			await this.createSlashCommand({
				name: registration.name,
				description: registration.description,
				options: registration.options,
			});
		}

		if (this.pruneMissingCommands) {
			for (const command of me.commands || []) {
				if (!desiredNames.has(command.name.toLowerCase())) {
					await this.deleteSlashCommand(command.id);
				}
			}
		}
	}

	sendMessage(input: ChannelBotMessageInput) {
		return this.request<{ success: boolean; message: ChannelBotMessage }>(
			"/v3/social/guild-bots/@me/messages",
			{
				method: "POST",
				body: input,
			},
		);
	}

	sendFollowUp(input: {
		guildId: string;
		channelId: string;
		interactionId: string;
		content?: string;
		embeds?: ChannelBotEmbed[];
		ephemeralForUserId?: string;
	}) {
		return this.sendMessage({
			guildId: input.guildId,
			channelId: input.channelId,
			content: input.content,
			embeds: input.embeds,
			followUp: true,
			followUpToInteractionId: input.interactionId,
			ephemeralForUserId: input.ephemeralForUserId,
		});
	}

	sendEphemeralMessage(input: {
		guildId: string;
		channelId: string;
		userId: string;
		content?: string;
		embeds?: ChannelBotEmbed[];
	}) {
		return this.sendMessage({
			guildId: input.guildId,
			channelId: input.channelId,
			content: input.content,
			embeds: input.embeds,
			ephemeralForUserId: input.userId,
		});
	}

	sendEmbed(input: {
		guildId: string;
		channelId: string;
		embed: ChannelBotEmbed;
		content?: string;
	}) {
		return this.sendMessage({
			guildId: input.guildId,
			channelId: input.channelId,
			content: input.content,
			embeds: [input.embed],
		});
	}

	editMessage(
		messageId: string,
		input: { content?: string; embeds?: ChannelBotEmbed[] },
	) {
		return this.request<{ success: boolean; message: ChannelBotMessage }>(
			`/v3/social/guild-bots/@me/messages/${messageId}`,
			{
				method: "PUT",
				body: input,
			},
		);
	}

	deleteMessage(messageId: string) {
		return this.request<{ success: boolean }>(
			`/v3/social/guild-bots/@me/messages/${messageId}`,
			{ method: "DELETE" },
		);
	}

	createSlashCommand(input: {
		name: string;
		description: string;
		options?: GuildBotSlashCommandOption[];
	}) {
		return this.request<{ success: boolean; command: GuildBotSlashCommand }>(
			"/v3/social/guild-bots/@me/commands",
			{
				method: "POST",
				body: input,
			},
		);
	}

	deleteSlashCommand(commandId: string) {
		return this.request<{ success: boolean }>(
			`/v3/social/guild-bots/@me/commands/${commandId}`,
			{ method: "DELETE" },
		);
	}

	timeoutMember(input: {
		guildId: string;
		userId: string;
		durationMinutes: number;
	}) {
		return this.request<GuildBotMemberTimeoutResponse>(
			`/v3/social/guild-bots/@me/guilds/${input.guildId}/members/${input.userId}/timeout`,
			{
				method: "PUT",
				body: {
					durationMinutes: input.durationMinutes,
				},
			},
		);
	}

	clearMemberTimeout(input: { guildId: string; userId: string }) {
		return this.request<{ success: boolean; message?: string }>(
			`/v3/social/guild-bots/@me/guilds/${input.guildId}/members/${input.userId}/timeout`,
			{ method: "DELETE" },
		);
	}
}
