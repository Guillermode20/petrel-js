import { sql } from "drizzle-orm"
import { sqliteTable, integer, text, primaryKey, index } from "drizzle-orm/sqlite-core"

export const users = sqliteTable("users", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	username: text("username").notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	role: text("role").notNull().default("user"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
})

export const refreshTokens = sqliteTable(
	"refresh_tokens",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		userId: integer("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		tokenHash: text("token_hash").notNull().unique(),
		expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
		revokedAt: integer("revoked_at", { mode: "timestamp" }),
	},
	(table) => ({
		userIdIdx: index("refresh_tokens_user_id_idx").on(table.userId),
		tokenHashIdx: index("refresh_tokens_token_hash_idx").on(table.tokenHash),
	})
)

export const files = sqliteTable("files", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	path: text("path").notNull(),
	size: integer("size").notNull(),
	mimeType: text("mime_type").notNull(),
	hash: text("hash").notNull(),
	uploadedBy: integer("uploaded_by").references(() => users.id),
	parentId: integer("parent_id").references(() => folders.id),
	thumbnailPath: text("thumbnail_path"),
	metadata: text("metadata", { mode: "json" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
})

export const folders = sqliteTable("folders", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	path: text("path").notNull(),
	parentId: integer("parent_id").references(() => folders.id),
	ownerId: integer("owner_id").references(() => users.id),
})

export const shares = sqliteTable("shares", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	type: text("type").notNull(),
	targetId: integer("target_id").notNull(),
	token: text("token").notNull().unique(),
	createdBy: integer("created_by").references(() => users.id),
	expiresAt: integer("expires_at", { mode: "timestamp" }),
	passwordHash: text("password_hash"),
	downloadCount: integer("download_count").notNull().default(0),
	viewCount: integer("view_count").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
})

export const shareSettings = sqliteTable("share_settings", {
	shareId: integer("share_id")
		.primaryKey()
		.references(() => shares.id),
	allowDownload: integer("allow_download", { mode: "boolean" })
		.notNull()
		.default(true),
	allowZip: integer("allow_zip", { mode: "boolean" })
		.notNull()
		.default(false),
	showMetadata: integer("show_metadata", { mode: "boolean" })
		.notNull()
		.default(true),
})

export const transcodeJobs = sqliteTable("transcode_jobs", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	fileId: integer("file_id")
		.notNull()
		.references(() => files.id),
	status: text("status").notNull().default("pending"),
	progress: integer("progress").notNull().default(0),
	outputPath: text("output_path"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	completedAt: integer("completed_at", { mode: "timestamp" }),
	error: text("error"),
})

export const videoTracks = sqliteTable("video_tracks", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	fileId: integer("file_id")
		.notNull()
		.references(() => files.id),
	trackType: text("track_type").notNull(),
	codec: text("codec").notNull(),
	language: text("language"),
	index: integer("index").notNull(),
	title: text("title"),
})

export const subtitles = sqliteTable("subtitles", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	fileId: integer("file_id")
		.notNull()
		.references(() => files.id),
	language: text("language").notNull(),
	path: text("path").notNull(),
	format: text("format").notNull(),
	title: text("title"),
})
