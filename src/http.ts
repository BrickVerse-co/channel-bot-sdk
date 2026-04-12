// (c) 2026 Meta Games LLC. All rights reserved.

export function normalizeApiBaseUrl(input: string): string {
	return input.replace(/\/+$/, "");
}

export function createWebSocketUrl(apiBaseUrl: string): string {
	const normalized = normalizeApiBaseUrl(apiBaseUrl);
	const resolved = new URL("/v3/social/guild-bots/ws", `${normalized}/`);
	resolved.protocol = resolved.protocol === "https:" ? "wss:" : "ws:";
	return resolved.toString();
}

export async function requestWithBotToken<T>(args: {
	fetchImpl: typeof fetch;
	apiBaseUrl: string;
	token: string;
	path: string;
	options?: Omit<RequestInit, "body"> & { body?: unknown };
}): Promise<T> {
	const endpoint = args.path.startsWith("/") ? args.path : `/${args.path}`;
	const options = args.options || {};
	const response = await args.fetchImpl(`${args.apiBaseUrl}${endpoint}`, {
		method: options.method || "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bot ${args.token}`,
			...(options.headers || {}),
		},
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
	});

	const data = (await response.json().catch(() => ({}))) as any;
	if (!response.ok || data.success === false) {
		throw new Error(
			data.message || `Channel bot request failed (${response.status})`,
		);
	}

	return data as T;
}
