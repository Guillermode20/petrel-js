import type { File } from "@petrel/shared";
import { fileService } from "./file.service";

interface AudioStreamSource {
	absolutePath: string;
	mimeType: string;
}

class AudioService {
	async getStreamSource(file: File): Promise<AudioStreamSource> {
		const absolutePath = fileService.resolveDiskPath(file);
		return { absolutePath, mimeType: file.mimeType };
	}
}

export const audioService = new AudioService();
