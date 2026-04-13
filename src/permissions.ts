// (c) 2026 Meta Games LLC. All rights reserved.

export const GuildPermissions = {
	EVERYONE: 1n << 0n,
	EDIT_UNIVERSES: 1n << 1n,
	ADMINISTRATOR: 1n << 2n,
	VIEW_FUNDS: 1n << 3n,
	MANAGE_FUNDS: 1n << 4n,
	MANAGE_RANKS: 1n << 5n,
	MANAGE_MEMBERS: 1n << 6n,
	VIEW_AUDIT_LOGS: 1n << 7n,
	VIEW_TRANSACTIONS: 1n << 8n,
	MANAGE_JOIN_REQUESTS: 1n << 9n,
	MANAGE_WEBHOOKS: 1n << 10n,
	VIEW_CHANNELS: 1n << 11n,
	SEND_MESSAGES: 1n << 12n,
	MANAGE_CHANNELS: 1n << 13n,
	MANAGE_GUILD_BOTS: 1n << 14n,
	MANAGE_GUILD_BOT_SETTINGS: 1n << 15n,
	MANAGE_MESSAGES: 1n << 16n,
	READ_MESSAGE_HISTORY: 1n << 17n,
	EMBED_LINKS: 1n << 19n,
	MENTION_EVERYONE: 1n << 20n,
	USE_SLASH_COMMANDS: 1n << 21n,
	MANAGE_SLASH_COMMANDS: 1n << 22n,
	CREATE_INVITES: 1n << 23n,
	KICK_MEMBERS: 1n << 24n,
	BAN_MEMBERS: 1n << 25n,
	TIMEOUT_MEMBERS: 1n << 26n,
	MANAGE_NICKNAMES: 1n << 27n,
	MANAGE_GUILD_PROFILE: 1n << 28n,
	VIEW_GUILD_ANALYTICS: 1n << 29n,
} as const;

export type GuildPermission =
	(typeof GuildPermissions)[keyof typeof GuildPermissions];

function toPermissionBits(
	permissions: string | number | bigint | null | undefined,
) {
	if (typeof permissions === "bigint") return permissions;
	if (typeof permissions === "number")
		return BigInt(Math.max(0, Math.floor(permissions)));
	if (typeof permissions === "string" && permissions.trim().length > 0) {
		return BigInt(permissions);
	}
	return 0n;
}

export function hasPermission(
	permissions: string | number | bigint | null | undefined,
	required: GuildPermission,
): boolean {
	const bits = toPermissionBits(permissions);
	return (bits & required) === required;
}

export function hasAnyPermission(
	permissions: string | number | bigint | null | undefined,
	required: GuildPermission[],
): boolean {
	const bits = toPermissionBits(permissions);
	for (const permission of required) {
		if ((bits & permission) === permission) return true;
	}
	return false;
}

export function hasAllPermissions(
	permissions: string | number | bigint | null | undefined,
	required: GuildPermission[],
): boolean {
	const bits = toPermissionBits(permissions);
	for (const permission of required) {
		if ((bits & permission) !== permission) return false;
	}
	return true;
}

export function parsePermissions(
	permissions: string | number | bigint | null | undefined,
): bigint {
	return toPermissionBits(permissions);
}
