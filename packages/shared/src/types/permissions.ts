export type UserRole = "admin" | "manager" | "editor" | "user" | "viewer" | "guest";

export type FilePermission =
	| "upload"
	| "download"
	| "delete"
	| "update"
	| "share"
	| "createFolders"
	| "deleteFolders"
	| "manageUsers"
	| "viewAuditLogs"
	| "deleteAnyFile"
	| "deleteAnyFolder";

export interface RolePermissions {
	role: UserRole;
	permissions: Set<FilePermission>;
}

export const ROLE_PERMISSIONS: Record<UserRole, FilePermission[]> = {
	admin: [
		"upload",
		"download",
		"delete",
		"update",
		"share",
		"createFolders",
		"deleteFolders",
		"manageUsers",
		"viewAuditLogs",
		"deleteAnyFile",
		"deleteAnyFolder",
	],
	manager: ["upload", "download", "delete", "update", "share", "createFolders", "deleteFolders"],
	editor: ["upload", "download", "delete", "update", "share", "createFolders", "deleteFolders"],
	user: ["upload", "download", "share", "createFolders"],
	viewer: ["download"],
	guest: [],
};

export function hasPermission(role: UserRole, permission: FilePermission): boolean {
	return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
