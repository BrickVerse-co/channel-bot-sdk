// (c) 2026 Meta Games LLC. All rights reserved.

import type { GuildBotSocketEvent } from "./types";

export type Listener<TEvent> = (event: TEvent) => void;

export class EventEmitter {
	private listeners = new Map<string, Set<Listener<any>>>();

	on<TEvent = GuildBotSocketEvent>(
		eventName: string,
		listener: Listener<TEvent>,
	) {
		const listeners = this.listeners.get(eventName) || new Set();
		
		listeners.add(listener as Listener<any>);
		this.listeners.set(eventName, listeners);

		return () => this.off(eventName, listener);
	}

	off<TEvent = GuildBotSocketEvent>(
		eventName: string,
		listener: Listener<TEvent>,
	) {
		const listeners = this.listeners.get(eventName);
		if (!listeners) return;

		listeners.delete(listener as Listener<any>);

		if (listeners.size === 0) {
			this.listeners.delete(eventName);
		}
	}

	emit<TEvent = GuildBotSocketEvent>(eventName: string, event: TEvent) {
		const listeners = this.listeners.get(eventName);
		if (!listeners) return;
		for (const listener of listeners) {
			listener(event);
		}
	}
}
