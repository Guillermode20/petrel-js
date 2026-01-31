import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { assessTranscodeNeeds, probeFile, transmuxToHLS } from "../lib/ffmpeg";
import { ensureDirectory, resolveStoragePath } from "../lib/storage";

function getHlsDirectory(fileId: number): string {
	return path.posix.join(".hls", fileId.toString());
}

async function fileExists(absolutePath: string): Promise<boolean> {
	const statResult = await stat(absolutePath).catch(() => null);
	return statResult !== null;
}

export interface StreamInfo {
	available: boolean;
	masterPlaylistPath: string | null;
	qualities: string[];
	isTransmux: boolean;
	needsTranscode: boolean;
}

export interface MasterPlaylist {
	content: string;
	qualities: Array<{
		name: string;
		bandwidth: number;
		resolution: string;
		playlistPath: string;
	}>;
}

export class StreamService {
	async getStreamInfo(fileId: number, filePath: string): Promise<StreamInfo> {
		const hlsDir = getHlsDirectory(fileId);
		const hlsDirAbsolute = resolveStoragePath(hlsDir);

		const masterPath = path.join(hlsDirAbsolute, "master.m3u8");
		const masterExists = await fileExists(masterPath);

		if (masterExists) {
			const files = await readdir(hlsDirAbsolute).catch(() => []);
			const playlists = files.filter((f) => f.endsWith(".m3u8") && f !== "master.m3u8");
			const qualities = playlists.map((p) => p.replace(".m3u8", ""));

			return {
				available: true,
				masterPlaylistPath: masterPath,
				qualities,
				isTransmux: qualities.length === 0 || qualities.includes("original"),
				needsTranscode: false,
			};
		}

		const probeResult = await probeFile(filePath);
		const assessment = assessTranscodeNeeds(probeResult);

		return {
			available: false,
			masterPlaylistPath: null,
			qualities: [],
			isTransmux: assessment.canTransmux,
			needsTranscode: !assessment.canTransmux,
		};
	}

	async generateTransmuxStream(fileId: number, filePath: string): Promise<string> {
		const hlsDir = getHlsDirectory(fileId);
		const hlsDirAbsolute = resolveStoragePath(hlsDir);
		await ensureDirectory(hlsDir);

		const masterPath = path.join(hlsDirAbsolute, "master.m3u8");
		if (await fileExists(masterPath)) {
			return masterPath;
		}

		await transmuxToHLS({
			inputPath: filePath,
			outputDir: hlsDirAbsolute,
		});

		return masterPath;
	}

	async getMasterPlaylist(fileId: number): Promise<MasterPlaylist | null> {
		const hlsDir = getHlsDirectory(fileId);
		const hlsDirAbsolute = resolveStoragePath(hlsDir);
		const masterPath = path.join(hlsDirAbsolute, "master.m3u8");

		if (!(await fileExists(masterPath))) {
			return null;
		}

		const content = await Bun.file(masterPath).text();
		const files = await readdir(hlsDirAbsolute).catch(() => []);
		const playlists = files.filter((f) => f.endsWith(".m3u8") && f !== "master.m3u8");

		const qualities = playlists.map((playlistFile) => {
			const name = playlistFile.replace(".m3u8", "");
			const resolution = this.getResolutionForQuality(name);
			const bandwidth = this.getBandwidthForQuality(name);

			return {
				name,
				bandwidth,
				resolution,
				playlistPath: path.join(hlsDirAbsolute, playlistFile),
			};
		});

		return { content, qualities };
	}

	async getQualityPlaylist(fileId: number, quality: string): Promise<string | null> {
		const hlsDir = getHlsDirectory(fileId);
		const hlsDirAbsolute = resolveStoragePath(hlsDir);
		const playlistPath = path.join(hlsDirAbsolute, `${quality}.m3u8`);

		if (!(await fileExists(playlistPath))) {
			return null;
		}

		return playlistPath;
	}

	async getSegment(fileId: number, segmentName: string): Promise<string | null> {
		const hlsDir = getHlsDirectory(fileId);
		const hlsDirAbsolute = resolveStoragePath(hlsDir);
		const segmentPath = path.join(hlsDirAbsolute, segmentName);

		if (!(await fileExists(segmentPath))) {
			return null;
		}

		return segmentPath;
	}

	/**
	 * Get the first segment URL for preloading.
	 * Returns the first .ts segment from the first available quality playlist.
	 */
	async getFirstSegmentUrl(fileId: number): Promise<string | null> {
		const hlsDir = getHlsDirectory(fileId);
		const hlsDirAbsolute = resolveStoragePath(hlsDir);

		// Read all files in the HLS directory
		const files = await readdir(hlsDirAbsolute).catch(() => []);

		// Find quality playlists (not master.m3u8)
		const playlists = files.filter((f) => f.endsWith(".m3u8") && f !== "master.m3u8");
		if (playlists.length === 0) {
			return null;
		}

		// Read the first playlist to find segments
		const firstPlaylist = playlists[0];
		if (!firstPlaylist) {
			return null;
		}
		const playlistPath = path.join(hlsDirAbsolute, firstPlaylist);
		const content = await Bun.file(playlistPath).text();

		// Parse segments from playlist
		const lines = content.split("\n");
		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith("#") && trimmed.endsWith(".ts")) {
				// Return the API URL for this segment
				return `/api/stream/${fileId}/${trimmed}`;
			}
		}

		return null;
	}

	generateMasterPlaylistContent(fileId: number, qualities: string[]): string {
		const lines = ["#EXTM3U"];

		for (const quality of qualities) {
			const bandwidth = this.getBandwidthForQuality(quality);
			const resolution = this.getResolutionForQuality(quality);
			lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}`);
			lines.push(`/api/stream/${fileId}/${quality}.m3u8`);
		}

		return lines.join("\n");
	}

	private getResolutionForQuality(quality: string): string {
		switch (quality) {
			case "1080p":
				return "1920x1080";
			case "720p":
				return "1280x720";
			case "480p":
				return "854x480";
			default:
				return "1920x1080";
		}
	}

	private getBandwidthForQuality(quality: string): number {
		switch (quality) {
			case "1080p":
				return 5000000;
			case "720p":
				return 2500000;
			case "480p":
				return 1000000;
			default:
				return 5000000;
		}
	}
}

export const streamService = new StreamService();
