/**
 * Cache key generators for consistent key naming across the application.
 *
 * Pattern: petrel:{domain}:{identifier}:{optional_sub_identifier}
 *
 * Examples:
 *   - petrel:file:123 (file metadata by ID)
 *   - petrel:files:list:root:0:20 (file list with pagination)
 *   - petrel:share:abc123 (share by token)
 *   - petrel:folder:path:/path/to/folder (folder by path)
 */

export const cacheKeys = {
	/**
	 * File metadata cache key by file ID.
	 */
	file: (fileId: number): string => `petrel:file:${fileId}`,

	/**
	 * File list cache key with folder path and pagination.
	 */
	fileList: (folderPath: string, limit: number, offset: number, search?: string): string => {
		const normalizedPath = folderPath.replace(/:/g, "_"); // Sanitize for cache key
		const searchSuffix = search ? `:search:${search}` : "";
		return `petrel:files:list:${normalizedPath}:${limit}:${offset}${searchSuffix}`;
	},

	/**
	 * Share cache key by token.
	 */
	share: (token: string): string => `petrel:share:${token}`,

	/**
	 * Share list cache key by user ID.
	 */
	shareList: (userId: number, limit: number, offset: number): string =>
		`petrel:shares:list:${userId}:${limit}:${offset}`,

	/**
	 * Folder metadata cache key by folder ID.
	 */
	folder: (folderId: number): string => `petrel:folder:${folderId}`,

	/**
	 * Folder cache key by full path.
	 */
	folderByPath: (path: string): string => {
		const normalizedPath = path.replace(/:/g, "_"); // Sanitize for cache key
		return `petrel:folder:path:${normalizedPath}`;
	},

	/**
	 * Folder list cache key.
	 */
	folderList: (parentId: number | null, limit: number, offset: number): string =>
		`petrel:folders:list:${parentId ?? "root"}:${limit}:${offset}`,

	/**
	 * User cache key by user ID.
	 */
	user: (userId: number): string => `petrel:user:${userId}`,

	/**
	 * User by username cache key.
	 */
	userByUsername: (username: string): string => `petrel:user:username:${username}`,

	/**
	 * Settings cache key.
	 */
	settings: (): string => "petrel:settings",

	/**
	 * Stream manifest cache key by file ID.
	 */
	streamManifest: (fileId: number): string => `petrel:stream:manifest:${fileId}`,

	/**
	 * Transcode job cache key by job ID.
	 */
	transcodeJob: (jobId: string): string => `petrel:transcode:${jobId}`,

	/**
	 * Generate a pattern to match all cache keys for a domain.
	 * Useful for invalidating all entries of a specific type.
	 */
	pattern: {
		/** Pattern for all file-related keys */
		allFiles: (): string => "petrel:file:*",
		/** Pattern for all file list keys */
		fileLists: (): string => "petrel:files:list:*",
		/** Pattern for all share-related keys */
		allShares: (): string => "petrel:share:*",
		/** Pattern for all share list keys */
		shareLists: (): string => "petrel:shares:*",
		/** Pattern for all folder-related keys */
		allFolders: (): string => "petrel:folder:*",
		/** Pattern for all user-related keys */
		allUsers: (): string => "petrel:user:*",
		/** Pattern for all settings keys */
		allSettings: (): string => "petrel:settings:*",
		/** Pattern for all keys in the petrel namespace */
		allPetrel: (): string => "petrel:*",
	},
};

/**
 * Cache TTL values in seconds for different data types.
 */
export const cacheTTL = {
	/** File metadata - rarely changes, 5 minutes */
	file: 300,
	/** File lists - can change frequently, 1 minute */
	fileList: 60,
	/** Share data - rarely changes, 2 minutes */
	share: 120,
	/** Share lists - can change, 1 minute */
	shareList: 60,
	/** Folder metadata - rarely changes, 5 minutes */
	folder: 300,
	/** Folder lists - can change, 1 minute */
	folderList: 60,
	/** User data - infrequently changes, 5 minutes */
	user: 300,
	/** Settings - rarely changes, 10 minutes */
	settings: 600,
	/** Stream manifests - relatively stable, 1 minute */
	streamManifest: 60,
	/** Transcode jobs - frequently change, 30 seconds */
	transcodeJob: 30,
} as const;
