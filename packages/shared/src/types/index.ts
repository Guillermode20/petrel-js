import type { FilePermission, RolePermissions, UserRole } from "./permissions";

export type { FilePermission, RolePermissions, UserRole } from "./permissions";
export { hasPermission, ROLE_PERMISSIONS } from "./permissions";

export interface User {
	id: number;
	username: string;
	role: UserRole;
	createdAt: Date;
}

export interface File {
	id: number;
	name: string;
	path: string;
	size: number;
	mimeType: string;
	hash: string;
	uploadedBy: number | null;
	parentId: number | null;
	thumbnailPath: string | null;
	createdAt: Date;
	metadata?: VideoMetadata | AudioMetadata | ImageMetadata;
}

export interface Folder {
	id: number;
	name: string;
	path: string;
	parentId: number | null;
	ownerId: number | null;
}

/**
 * Union type for file browser items
 */
export type FileItem = File | Folder;

export type ShareType = "file" | "folder";

export interface Share {
	id: number;
	type: ShareType;
	targetId: number;
	token: string;
	expiresAt: Date | null;
	passwordHash: string | null;
	hasPassword: boolean;
	downloadCount: number;
	viewCount: number;
	createdBy: number | null;
	createdAt: Date;
}

export interface ShareSettings {
	shareId: number;
	allowDownload: boolean;
	allowZip: boolean;
	showMetadata: boolean;
}

export type TranscodeStatus = "pending" | "processing" | "completed" | "failed";

export interface TranscodeJob {
	id: number;
	fileId: number;
	status: TranscodeStatus;
	progress: number;
	outputPath: string | null;
	createdAt: Date;
	completedAt: Date | null;
	error: string | null;
}

export type VideoTrackType = "video" | "audio" | "subtitle";

export interface VideoTrack {
	id: number;
	fileId: number;
	trackType: VideoTrackType;
	codec: string;
	language: string | null;
	index: number;
	title: string | null;
}

export interface Subtitle {
	id: number;
	fileId: number;
	language: string;
	path: string;
	format: string;
	title: string | null;
}

export interface VideoMetadata {
	duration: number;
	width: number;
	height: number;
	codec: string;
	bitrate: number;
	fps: number;
	audioTracks: Array<{
		codec: string;
		language: string | null;
		channels: number;
	}>;
	subtitles: Array<{
		language: string;
		format: string;
	}>;
}

export interface AudioMetadata {
	duration: number;
	codec: string;
	bitrate: number;
	sampleRate: number;
	channels: number;
	title: string | null;
	artist: string | null;
	album: string | null;
	year: number | null;
	genre: string | null;
	albumArt: boolean;
}

export interface ImageMetadata {
	width: number;
	height: number;
	format: string;
	exif: {
		make: string | null;
		model: string | null;
		lens: string | null;
		dateTaken: Date | null;
		exposureTime: string | null;
		fNumber: string | null;
		iso: number | null;
		focalLength: string | null;
		gps: {
			latitude: number;
			longitude: number;
		} | null;
	} | null;
}

export interface PaginationInfo {
	limit: number;
	offset: number;
	total: number;
}

export interface FileListData {
	files: File[];
	folders: Folder[];
	currentFolder: Folder | null;
	parentChain: Folder[];
	pagination: PaginationInfo;
}

export interface ApiResponse<T> {
	data: T | null;
	error: string | null;
}

export interface PaginatedResponse<T> {
	data: {
		items: T[];
		total: number;
		page: number;
		limit: number;
		hasMore: boolean;
	} | null;
	error: string | null;
}

export type VideoQuality = "auto" | "1080p" | "720p" | "480p";
export type AudioVisualizer = "waveform" | "spectrum" | "none";
export type ViewMode = "grid" | "list";
export type SortBy = "name" | "date" | "size" | "type";
export type ExpiryDuration = "1h" | "24h" | "7d" | "30d" | "never";
export type AccentColor = "orange" | "teal" | "purple" | "custom";
export type FontSize = "small" | "medium" | "large";
export type ThemeMode = "dark" | "light" | "system";

export interface UserSettings {
	userId: number;
	profile: {
		username: string;
		displayName: string | null;
	};
	playback: {
		video: {
			defaultQuality: VideoQuality;
			autoplayNext: boolean;
			defaultVolume: number;
			subtitleLanguagePriority: string[];
			audioLanguagePriority: string[];
			rememberPlaybackPosition: boolean;
			defaultPlaybackSpeed: number;
		};
		audio: {
			volumeNormalization: boolean;
			gaplessPlayback: boolean;
			visualizerStyle: AudioVisualizer;
		};
	};
	display: {
		theme: {
			mode: ThemeMode;
			accentColor: AccentColor;
			fontSize: FontSize;
			sharpCorners: boolean;
			terminalEffects: boolean;
		};
		fileBrowser: {
			defaultViewMode: ViewMode;
			itemsPerPage: number;
			showHiddenFiles: boolean;
			thumbnailSize: number;
			defaultSortBy: SortBy;
			folderThumbnailPreview: boolean;
		};
	};
	sharing: {
		defaultExpiry: ExpiryDuration;
		defaultPasswordProtection: boolean;
		defaultDownloadPermission: boolean;
		defaultQuality: VideoQuality;
		analyticsOptOut: boolean;
		autoExpireOldShares: {
			enabled: boolean;
			thresholdDays: number;
		};
	};
	storage: {
		defaultUploadFolder: string | null;
		parallelUploadLimit: number;
		autoTranscode: "on" | "off" | "ask";
		duplicateFileHandling: "skip" | "rename" | "overwrite";
	};
	notifications: {
		inApp: {
			uploadComplete: boolean;
			transcodeComplete: boolean;
			shareAccessed: boolean;
			lowStorageWarning: boolean;
		};
		email: {
			shareExpiryWarning: boolean;
			uploadCompletion: boolean;
			securityAlerts: boolean;
		};
	};
}

export interface CreatePersonalAccessTokenInput {
	name: string;
	expiresAt: Date | null;
	scopes: string[];
}

export interface PersonalAccessToken {
	id: number;
	name: string;
	token: string;
	expiresAt: Date | null;
	scopes: string[];
	createdAt: Date;
	lastUsedAt: Date | null;
}

export interface ServerSettings {
	transcoding: {
		audioTranscodeFlac: boolean;
		audioOpusBitrateKbps: number;
	};
}
