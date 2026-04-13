// (c) 2026 Meta Games LLC. All rights reserved.

import { EventEmitter } from "./events";
import {
	createWebSocketUrl,
	normalizeApiBaseUrl,
	requestWithBotToken,
} from "./http";
import { CommandRouter } from "./commands";
import {
	DEFAULT_ROUTER_SUBSCRIBED_EVENTS,
	GUILD_BOT_SUBSCRIBABLE_EVENTS,
} from "./types";
import type {
	ChannelBotClientOptions,
	ChannelBotEmbed,
	ChannelBotEventAliasMap,
	GuildBotSlashCommand,
	GuildBotSlashCommandOption,
	ChannelBotMessage,
	ChannelBotMessageInput,
	ChannelBotEventMap,
	ChannelBotWebSocketState,
	GuildBotMeResponse,
	GuildBotMemberTimeoutResponse,
	GuildBotSocketEvent,
	GuildBotSubscribableEvent,
} from "./types";

const SUBSCRIBABLE_EVENT_SET = new Set<string>(GUILD_BOT_SUBSCRIBABLE_EVENTS);

function normalizeSubscribedEvents(
	events: readonly string[],
): GuildBotSubscribableEvent[] {
	const normalized: GuildBotSubscribableEvent[] = [];
	const seen = new Set<string>();

	for (const rawEvent of events) {
		if (typeof rawEvent !== "string") continue;
		const eventName = rawEvent.trim();
		if (!eventName || seen.has(eventName)) continue;
		if (!SUBSCRIBABLE_EVENT_SET.has(eventName)) continue;
		seen.add(eventName);
		normalized.push(eventName as GuildBotSubscribableEvent);
	}

	return normalized;
}

const EVENT_ALIASES: Partial<Record<GuildBotSocketEvent["type"], string[]>> = {
	"guildBot.ready": ["ready"],
	"guildBot.error": ["error"],
	"guildBot.messageCreate": ["messageCreate"],
	"guildBot.messageUpdate": ["messageUpdate"],
	"guildBot.messageDelete": ["messageDelete"],
	"guildBot.reactionUpdate": ["reactionUpdate"],
	"guildBot.interactionCreate": ["interactionCreate"],
	"guildBot.installationCreate": ["guildCreate"],
	"guildBot.installationDelete": ["guildDelete"],
	"guildBot.memberJoin": ["memberAdd"],
	"guildBot.memberLeave": ["memberRemove"],
	"guildBot.memberKick": ["memberKick"],
	"guildBot.memberBan": ["memberBan"],
	"guildBot.memberTimeout": ["memberTimeout"],
	"guildBot.memberRankUpdate": ["memberRankUpdate"],
	"guildBot.auditLogCreate": ["auditLogCreate"],
};

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
	private subscribedEvents: GuildBotSubscribableEvent[];
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private manuallyClosed = false;
	private ws: WebSocket | null = null;
	private ready = false;
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
		this.subscribedEvents = normalizeSubscribedEvents(
			options.subscribedEvents || [],
		);
	}

	on<K extends keyof ChannelBotEventMap>(
		eventName: K,
		listener: (event: ChannelBotEventMap[K]) => void,
	) {
		return this.events.on<ChannelBotEventMap[K]>(eventName as string, listener);
	}

	onAlias<K extends keyof ChannelBotEventAliasMap>(
		eventName: K,
		listener: (event: ChannelBotEventAliasMap[K]) => void,
	) {
		return this.on(eventName, listener);
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

	onReady(listener: (event: ChannelBotEventAliasMap["ready"]) => void) {
		return this.on("ready", listener);
	}

	onMessageCreate(
		listener: (event: ChannelBotEventAliasMap["messageCreate"]) => void,
	) {
		return this.on("messageCreate", listener);
	}

	onMessageUpdate(
		listener: (event: ChannelBotEventAliasMap["messageUpdate"]) => void,
	) {
		return this.on("messageUpdate", listener);
	}

	onMessageDelete(
		listener: (event: ChannelBotEventAliasMap["messageDelete"]) => void,
	) {
		return this.on("messageDelete", listener);
	}

	onInteractionCreate(
		listener: (event: ChannelBotEventAliasMap["interactionCreate"]) => void,
	) {
		return this.on("interactionCreate", listener);
	}

	onGuildCreate(
		listener: (event: ChannelBotEventAliasMap["guildCreate"]) => void,
	) {
		return this.on("guildCreate", listener);
	}

	onGuildDelete(
		listener: (event: ChannelBotEventAliasMap["guildDelete"]) => void,
	) {
		return this.on("guildDelete", listener);
	}

	onCommandError(
		listener: (event: ChannelBotEventAliasMap["commandError"]) => void,
	) {
		return this.on("commandError", listener);
	}

	onClose(listener: (event: ChannelBotEventAliasMap["close"]) => void) {
		return this.on("close", listener);
	}

	isReady() {
		return this.ready;
	}

	isConnected() {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	getWebSocketReadyState() {
		return this.ws?.readyState ?? null;
	}

	getWebSocketState(): ChannelBotWebSocketState {
		const state = this.getWebSocketReadyState();
		if (state === null) return "UNINITIALIZED";
		if (state === WebSocket.CONNECTING) return "CONNECTING";
		if (state === WebSocket.OPEN) return "OPEN";
		if (state === WebSocket.CLOSING) return "CLOSING";
		return "CLOSED";
	}

	useCommandRouter(router: CommandRouter) {
		this.commandRouter = router;
		this.addSubscribedEvents(DEFAULT_ROUTER_SUBSCRIBED_EVENTS);

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

	setSubscribedEvents(events: GuildBotSubscribableEvent[]) {
		this.subscribedEvents = normalizeSubscribedEvents(events);

		if (
			this.ws &&
			this.ws.readyState === 1 &&
			this.subscribedEvents.length > 0
		) {
			this.subscribeToEvents(this.subscribedEvents);
		}

		return this;
	}

	addSubscribedEvents(events: GuildBotSubscribableEvent[]) {
		this.subscribedEvents = normalizeSubscribedEvents([
			...this.subscribedEvents,
			...events,
		]);

		if (
			this.ws &&
			this.ws.readyState === 1 &&
			this.subscribedEvents.length > 0
		) {
			this.subscribeToEvents(this.subscribedEvents);
		}

		return this;
	}

	getSubscribedEvents() {
		return [...this.subscribedEvents];
	}

	async connect(): Promise<void> {
		this.manuallyClosed = false;
		this.ready = false;
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
				} catch (err) {
					console.error("Failed to parse guild bot websocket message", err);
					return;
				}

				this.events.emit("raw", parsed);
				this.events.emit(parsed.type, parsed);
				const aliases = EVENT_ALIASES[parsed.type] || [];
				for (const alias of aliases) {
					this.events.emit(alias, parsed);
				}

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
						this.events.emit("commandError", {
							type: "guildBot.commandError",
							error,
							event: parsed,
						});
					});
				}

				if (parsed.type === "guildBot.ready" && !resolved) {
					this.ready = true;
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
					this.ready = false;
					resolved = true;
					reject(new Error(parsed.message || "Guild bot websocket error"));
				}
			};

			ws.onerror = () => {
				this.ready = false;
				if (resolved) return;
				resolved = true;
				reject(new Error("Guild bot websocket connection failed"));
			};

			ws.onclose = () => {
				this.ready = false;
				this.ws = null;
				this.events.emit("disconnected", { type: "disconnected" });
				this.events.emit("close", { type: "disconnected" });
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

	once<K extends keyof ChannelBotEventMap>(
		eventName: K,
		listener: (event: ChannelBotEventMap[K]) => void,
	) {
		return this.events.once<ChannelBotEventMap[K]>(
			eventName as string,
			listener,
		);
	}

	login() {
		return this.connect();
	}

	destroy() {
		this.disconnect();
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
		this.ready = false;

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	subscribeToEvents(events: GuildBotSubscribableEvent[]) {
		if (!this.ws || this.ws.readyState !== 1) return;
		const normalized = normalizeSubscribedEvents(events);
		if (normalized.length === 0) return;
		console.debug("Subscribing to guild bot events:", normalized);
		this.ws.send(
			JSON.stringify({
				type: "guildBot.subscribe",
				events: normalized,
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

	timeout(guildId: string, userId: string, durationMinutes: number) {
		return this.timeoutMember({ guildId, userId, durationMinutes });
	}

	removeTimeout(guildId: string, userId: string) {
		return this.clearMemberTimeout({ guildId, userId });
	}
}
