import type { File, Folder, Share, TranscodeJob, UserSettings } from "@petrel/shared";

const ID_COUNTERS = {
	user: 1,
	file: 1,
	folder: 1,
	share: 1,
	transcodeJob: 1,
};

export function resetCounters(): void {
	ID_COUNTERS.user = 1;
	ID_COUNTERS.file = 1;
	ID_COUNTERS.folder = 1;
	ID_COUNTERS.share = 1;
	ID_COUNTERS.transcodeJob = 1;
}

export function createMockUser(
	overrides?: Partial<typeof import("@petrel/shared").User>,
): typeof import("@petrel/shared").User {
	const id = ID_COUNTERS.user++;
	return {
		id,
		username: `user${id}`,
		role: "user",
		createdAt: new Date(),
		...overrides,
	};
}

export function createMockFile(overrides?: Partial<File>): File {
	const id = ID_COUNTERS.file++;
	const now = new Date();
	return {
		id,
		name: `file${id}.mp4`,
		path: `/file${id}.mp4`,
		size: 1024 * 1024 * 10,
		mimeType: "video/mp4",
		hash: `hash${id}`,
		uploadedBy: 1,
		parentId: null,
		thumbnailPath: null,
		createdAt: now,
		metadata: undefined,
		...overrides,
	};
}

export function createMockVideoFile(overrides?: Partial<File>): File {
	const id = ID_COUNTERS.file++;
	return {
		id,
		name: `video${id}.mp4`,
		path: `/videos/video${id}.mp4`,
		size: 1024 * 1024 * 100,
		mimeType: "video/mp4",
		hash: `videohash${id}`,
		uploadedBy: 1,
		parentId: null,
		thumbnailPath: `/thumbnails/${id}.jpg`,
		createdAt: new Date(),
		metadata: {
			duration: 360,
			width: 1920,
			height: 1080,
			codec: "h264",
			bitrate: 5000000,
			fps: 30,
			audioTracks: [
				{
					codec: "aac",
					language: "eng",
					channels: 2,
				},
			],
			subtitles: [
				{
					language: "eng",
					format: "srt",
				},
			],
		},
		...overrides,
	};
}

export function createMockAudioFile(overrides?: Partial<File>): File {
	const id = ID_COUNTERS.file++;
	return {
		id,
		name: `audio${id}.mp3`,
		path: `/audio/audio${id}.mp3`,
		size: 1024 * 1024 * 5,
		mimeType: "audio/mpeg",
		hash: `audiohash${id}`,
		uploadedBy: 1,
		parentId: null,
		thumbnailPath: null,
		createdAt: new Date(),
		metadata: {
			duration: 240,
			codec: "mp3",
			bitrate: 320000,
			sampleRate: 44100,
			channels: 2,
			title: `Test Track ${id}`,
			artist: "Test Artist",
			album: "Test Album",
			year: 2024,
			genre: "Test Genre",
			albumArt: false,
		},
		...overrides,
	};
}

export function createMockImageFile(overrides?: Partial<File>): File {
	const id = ID_COUNTERS.file++;
	return {
		id,
		name: `image${id}.jpg`,
		path: `/images/image${id}.jpg`,
		size: 1024 * 1024 * 2,
		mimeType: "image/jpeg",
		hash: `imagehash${id}`,
		uploadedBy: 1,
		parentId: null,
		thumbnailPath: `/thumbnails/${id}.jpg`,
		createdAt: new Date(),
		metadata: {
			width: 1920,
			height: 1080,
			format: "jpeg",
			exif: {
				make: "Test Camera",
				model: "Test Model",
				lens: "Test Lens",
				dateTaken: new Date(),
				exposureTime: "1/125",
				fNumber: "f/2.8",
				iso: 400,
				focalLength: "50mm",
				gps: null,
			},
		},
		...overrides,
	};
}

export function createMockFolder(overrides?: Partial<Folder>): Folder {
	const id = ID_COUNTERS.folder++;
	return {
		id,
		name: `folder${id}`,
		path: `/folder${id}`,
		parentId: null,
		ownerId: 1,
		...overrides,
	};
}

export function createMockShare(overrides?: Partial<Share>): Share {
	const id = ID_COUNTERS.share++;
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	return {
		id,
		type: "file",
		targetId: 1,
		token: `share${id}token`,
		expiresAt,
		passwordHash: null,
		hasPassword: false,
		downloadCount: 0,
		viewCount: 0,
		createdBy: 1,
		createdAt: now,
		...overrides,
	};
}

export function createMockTranscodeJob(overrides?: Partial<TranscodeJob>): TranscodeJob {
	const id = ID_COUNTERS.transcodeJob++;
	return {
		id,
		fileId: 1,
		status: "pending",
		progress: 0,
		outputPath: null,
		createdAt: new Date(),
		completedAt: null,
		error: null,
		...overrides,
	};
}

export function createMockSettings(overrides?: Partial<UserSettings>): UserSettings {
	return {
		userId: 1,
		profile: {
			username: "testuser",
			displayName: "Test User",
		},
		playback: {
			video: {
				defaultQuality: "auto",
				autoplayNext: true,
				defaultVolume: 80,
				subtitleLanguagePriority: ["eng"],
				audioLanguagePriority: ["eng"],
				rememberPlaybackPosition: true,
				defaultPlaybackSpeed: 1,
			},
			audio: {
				volumeNormalization: true,
				gaplessPlayback: false,
				visualizerStyle: "waveform",
			},
		},
		display: {
			theme: {
				mode: "dark",
				accentColor: "orange",
				fontSize: "medium",
				sharpCorners: true,
				terminalEffects: true,
			},
			fileBrowser: {
				defaultViewMode: "grid",
				itemsPerPage: 20,
				showHiddenFiles: false,
				thumbnailSize: 200,
				defaultSortBy: "name",
				folderThumbnailPreview: true,
			},
		},
		sharing: {
			defaultExpiry: "never",
			defaultPasswordProtection: false,
			defaultDownloadPermission: true,
			defaultQuality: "auto",
			analyticsOptOut: false,
			autoExpireOldShares: {
				enabled: false,
				thresholdDays: 30,
			},
		},
		storage: {
			defaultUploadFolder: null,
			parallelUploadLimit: 3,
			autoTranscode: "ask",
			duplicateFileHandling: "rename",
		},
		notifications: {
			inApp: {
				uploadComplete: true,
				transcodeComplete: true,
				shareAccessed: true,
				lowStorageWarning: true,
			},
			email: {
				shareExpiryWarning: true,
				uploadCompletion: false,
				securityAlerts: true,
			},
		},
		...overrides,
	};
}
