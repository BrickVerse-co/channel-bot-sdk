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
	ChannelBotMessage,
	ChannelBotMessageInput,
	GuildBotMeResponse,
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
	}

	on<TEvent = GuildBotSocketEvent>(
		eventName: string,
		listener: (event: TEvent) => void,
	) {
		return this.events.on<TEvent>(eventName, listener);
	}

	off<TEvent = GuildBotSocketEvent>(
		eventName: string,
		listener: (event: TEvent) => void,
	) {
		return this.events.off<TEvent>(eventName, listener);
	}

	useCommandRouter(router: CommandRouter) {
		this.commandRouter = router;
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
				} catch {
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
					resolve();
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

	sendMessage(input: ChannelBotMessageInput) {
		return this.request<{ success: boolean; message: ChannelBotMessage }>(
			"/v3/social/guild-bots/@me/messages",
			{
				method: "POST",
				body: input,
			},
		);
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
}
