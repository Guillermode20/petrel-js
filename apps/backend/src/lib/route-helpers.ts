import { config } from "../config";
import { folderService } from "../services/folder.service";
import { normalizeFileName, normalizeRelativePath, type ThumbnailSize } from "./storage";

const GUEST_ACCESS_ENABLED = config.PETREL_GUEST_ACCESS;

export function canRead(user: unknown): boolean {
	return Boolean(user) || GUEST_ACCESS_ENABLED;
}

export function getPagination(query: { limit?: number; offset?: number }): {
	limit: number;
	offset: number;
} {
	const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
	const offset = Math.max(query.offset ?? 0, 0);
	return { limit, offset };
}

export function parseThumbnailSize(input: string | undefined): ThumbnailSize {
	if (input === "small" || input === "large" || input === "blur") return input;
	return "medium";
}

export function normalizePathSafe(
	value: string | undefined,
	set: { status?: number | string },
): string | null {
	try {
		return normalizeRelativePath(value ?? "");
	} catch {
		set.status = 400;
		return null;
	}
}

export function normalizeNameSafe(value: string, set: { status?: number | string }): string | null {
	try {
		return normalizeFileName(value);
	} catch {
		set.status = 400;
		return null;
	}
}

export function parseNumberField(
	value: number | string,
	set: { status?: number | string },
	_field: string,
): number | null {
	const parsed = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(parsed)) {
		set.status = 400;
		return null;
	}
	return parsed;
}

export async function resolveFolderPathById(
	folderId: number | null,
	set: { status?: number | string },
): Promise<string | null> {
	if (folderId === null) return "";
	const folder = await folderService.getById(folderId);
	if (!folder) {
		set.status = 404;
		return null;
	}
	return folder.path;
}
