import type { File, Folder, Share, ShareSettings, TranscodeJob, User } from "@petrel/shared";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

/**
 * Standard API response shape from Petrel backend
 */
export interface ApiResponse<T> {
	data: T | null;
	error: string | null;
}

/**
 * Pagination metadata returned by list endpoints
 */
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

/**
 * API client for Petrel backend
 */
class ApiClient {
	private accessToken: string | null = null;

	setAccessToken(token: string | null): void {
		this.accessToken = token;
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			...options.headers,
		};

		if (this.accessToken) {
			(headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`;
		}

		let response = await fetch(`${API_BASE}${endpoint}`, {
			...options,
			headers,
		});

		// Handle initial 401 - try refresh once
		if (response.status === 401) {
			const refreshToken = localStorage.getItem("petrel_refresh_token");
			if (refreshToken) {
				try {
					const data = await this.refreshToken(refreshToken);
					localStorage.setItem("petrel_access_token", data.accessToken);
					localStorage.setItem("petrel_refresh_token", data.refreshToken);
					this.setAccessToken(data.accessToken);

					// Retry request with new token
					(headers as Record<string, string>).Authorization = `Bearer ${data.accessToken}`;
					response = await fetch(`${API_BASE}${endpoint}`, {
						...options,
						headers,
					});
				} catch (_err) {
					// Refresh failed, clear tokens
					localStorage.removeItem("petrel_access_token");
					localStorage.removeItem("petrel_refresh_token");
					this.setAccessToken(null);
					throw new Error("Unauthorized");
				}
			}
		}

		const result = await response.json();

		if (result.error) {
			throw new Error(result.error);
		}

		return result.data;
	}

	// Auth endpoints - these don't use the standard { data, error } wrapper
	async login(
		username: string,
		password: string,
	): Promise<{ accessToken: string; refreshToken: string; user: User }> {
		const response = await fetch(`${API_BASE}/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username, password }),
		});

		const contentType = response.headers.get("content-type");
		if (!contentType?.includes("application/json")) {
			const text = await response.text();
			throw new Error(text || `HTTP ${response.status}`);
		}

		const result: ApiResponse<{ accessToken: string; refreshToken: string; user: User }> =
			await response.json();

		if (result.error || !result.data) {
			throw new Error(result.error || "Login failed");
		}

		return result.data;
	}

	async logout(refreshToken: string): Promise<void> {
		await fetch(`${API_BASE}/auth/logout`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${refreshToken}`,
			},
		});
	}

	async refreshToken(
		refreshToken: string,
	): Promise<{ accessToken: string; refreshToken: string; user: User }> {
		const response = await fetch(`${API_BASE}/auth/refresh`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${refreshToken}`,
			},
		});

		const contentType = response.headers.get("content-type");
		if (!contentType?.includes("application/json")) {
			const text = await response.text();
			throw new Error(text || `HTTP ${response.status}`);
		}

		const result: ApiResponse<{ accessToken: string; refreshToken: string; user: User }> =
			await response.json();

		if (result.error || !result.data) {
			throw new Error(result.error || "Token refresh failed");
		}

		return result.data;
	}

	async getCurrentUser(): Promise<User | null> {
		const token = localStorage.getItem("petrel_access_token");
		if (!token) return null;

		try {
			// Use standard request which handles refresh
			return await this.request("/auth/me");
		} catch (err) {
			if ((err as Error).message.includes("Unauthorized")) {
				return null;
			}
			throw err;
		}
	}

	// Files endpoints
	async getFiles(params?: {
		folderId?: number;
		page?: number;
		limit?: number;
		sort?: "name" | "date" | "size" | "type";
		order?: "asc" | "desc";
		search?: string;
	}): Promise<{
		items: Array<File | Folder>;
		currentFolder: Folder | null;
		parentChain: Folder[];
		total: number;
		page: number;
		limit: number;
		hasMore: boolean;
	}> {
		const searchParams = new URLSearchParams();
		if (params?.folderId) searchParams.set("folderId", String(params.folderId));

		const limit = params?.limit ?? 20;
		const page = params?.page ?? 1;
		const offset = Math.max(page - 1, 0) * limit;
		searchParams.set("limit", String(limit));
		searchParams.set("offset", String(offset));

		const query = searchParams.toString();
		const result = await this.request<{
			files: File[];
			folders: Folder[];
			currentFolder: Folder | null;
			parentChain: Folder[];
			pagination: { limit: number; offset: number; total: number };
		}>(`/files${query ? `?${query}` : ""}`);

		const items = [...(result.folders ?? []), ...(result.files ?? [])];
		const total = result.pagination?.total ?? items.length;
		const resolvedLimit = result.pagination?.limit ?? limit;
		const resolvedOffset = result.pagination?.offset ?? offset;
		const resolvedPage = Math.floor(resolvedOffset / resolvedLimit) + 1;
		const hasMore = resolvedOffset + resolvedLimit < total;

		return {
			items,
			currentFolder: result.currentFolder,
			parentChain: result.parentChain ?? [],
			total,
			page: resolvedPage,
			limit: resolvedLimit,
			hasMore,
		};
	}

	async getFile(id: number): Promise<File> {
		return this.request(`/files/${id}`);
	}

	async uploadFile(
		file: globalThis.File,
		folderId?: number,
		onProgress?: (progress: number) => void,
	): Promise<File> {
		// Generate a unique upload ID
		const uploadId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

		// For now, send as single chunk (totalChunks = 1, chunkIndex = 0)
		const formData = new FormData();
		formData.append("uploadId", uploadId);
		formData.append("chunkIndex", "0");
		formData.append("totalChunks", "1");
		formData.append("fileName", file.name);
		formData.append("mimeType", file.type);
		formData.append("size", String(file.size));
		formData.append("chunk", file);
		if (folderId) formData.append("folderId", String(folderId));

		// Use XHR for progress tracking
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open("POST", `${API_BASE}/files/upload`);

			if (this.accessToken) {
				xhr.setRequestHeader("Authorization", `Bearer ${this.accessToken}`);
			}

			xhr.upload.onprogress = (event) => {
				if (event.lengthComputable && onProgress) {
					onProgress((event.loaded / event.total) * 100);
				}
			};

			xhr.onload = () => {
				try {
					const result = JSON.parse(xhr.responseText);
					if (result.error) {
						reject(new Error(result.error));
					} else {
						resolve(result.data);
					}
				} catch {
					reject(new Error("Failed to parse upload response"));
				}
			};

			xhr.onerror = () => reject(new Error("Upload failed"));
			xhr.send(formData);
		});
	}

	async deleteFile(id: number): Promise<void> {
		return this.request(`/files/${id}`, { method: "DELETE" });
	}

	async updateFile(id: number, data: { name?: string; folderId?: number | null }): Promise<File> {
		return this.request(`/files/${id}`, {
			method: "PATCH",
			body: JSON.stringify(data),
		});
	}

	async updateFileContent(id: number, content: string): Promise<File> {
		return this.request(`/files/${id}/content`, {
			method: "PUT",
			body: JSON.stringify({ content }),
		});
	}

	async createFolder(name: string, parentId?: number): Promise<Folder> {
		return this.request("/folders", {
			method: "POST",
			body: JSON.stringify({ name, parentId }),
		});
	}

	async updateFolder(
		id: number,
		data: { name?: string; parentId?: number | null },
	): Promise<{ id: number }> {
		return this.request(`/folders/${id}`, {
			method: "PATCH",
			body: JSON.stringify(data),
		});
	}

	getDownloadUrl(id: number): string {
		const token = this.accessToken ? `?token=${this.accessToken}` : "";
		return `${API_BASE}/files/${id}/download${token}`;
	}

	getAudioStreamUrl(id: number, options?: { shareToken?: string; password?: string }): string {
		const params = new URLSearchParams();
		if (this.accessToken) {
			params.set("token", this.accessToken);
		}
		if (options?.shareToken) {
			params.set("shareToken", options.shareToken);
		}
		if (options?.password) {
			params.set("password", options.password);
		}

		const query = params.toString();
		return `${API_BASE}/audio/${id}/stream${query ? `?${query}` : ""}`;
	}

	getThumbnailUrl(id: number, size: "small" | "medium" | "large" = "medium"): string {
		const tokenParam = this.accessToken ? `&token=${this.accessToken}` : "";
		return `${API_BASE}/files/${id}/thumbnail?size=${size}${tokenParam}`;
	}

	getSpriteUrl(id: number): string {
		const token = this.accessToken ? `?token=${this.accessToken}` : "";
		return `${API_BASE}/files/${id}/sprite${token}`;
	}

	getMasterPlaylistUrl(id: number): string {
		const token = this.accessToken ? `?token=${this.accessToken}` : "";
		return `${API_BASE}/stream/${id}/master.m3u8${token}`;
	}

	// Shares endpoints
	async createShare(data: {
		type: "file" | "folder";
		targetId: number;
		expiresAt?: string;
		password?: string;
		allowDownload?: boolean;
		allowZip?: boolean;
		showMetadata?: boolean;
	}): Promise<Share & ShareSettings> {
		return this.request("/shares", {
			method: "POST",
			body: JSON.stringify(data),
		});
	}

	async getShare(
		token: string,
		password?: string,
	): Promise<{
		share: Share & ShareSettings;
		content: File | Folder;
		files?: File[];
	}> {
		const params = password ? `?password=${encodeURIComponent(password)}` : "";
		return this.request(`/shares/${token}${params}`);
	}

	async updateShare(
		id: number,
		data: { expiresAt?: string; password?: string; allowDownload?: boolean; allowZip?: boolean },
	): Promise<Share> {
		return this.request(`/shares/${id}`, {
			method: "PATCH",
			body: JSON.stringify(data),
		});
	}

	async deleteShare(id: number): Promise<void> {
		return this.request(`/shares/${id}`, { method: "DELETE" });
	}

	async getMyShares(): Promise<Array<Share & ShareSettings & { content: File | Folder }>> {
		return this.request("/shares");
	}

	// Stream endpoints
	async getStreamInfo(fileId: number): Promise<{
		available: boolean;
		qualities: string[];
		isTransmux: boolean;
		needsTranscode: boolean;
		transcodeJob: TranscodeJob | null;
	}> {
		return this.request(`/stream/${fileId}/info`);
	}

	async getStreamSubtitles(
		fileId: number,
	): Promise<Array<{ id: number; language: string; title: string | null }>> {
		return this.request(`/stream/${fileId}/subtitles`);
	}

	async getStreamTracks(fileId: number): Promise<
		Array<{
			index: number;
			type: string;
			codec: string;
			language: string | null;
			title: string | null;
		}>
	> {
		return this.request(`/stream/${fileId}/tracks`);
	}

	async prepareStream(
		fileId: number,
	): Promise<{ jobId?: number; ready: boolean; firstSegmentUrl?: string }> {
		return this.request(`/stream/${fileId}/prepare`, { method: "POST" });
	}
}

export const api = new ApiClient();
