import type { TranscodeJob } from "@petrel/shared";

export interface StreamInfoResponse {
	available: boolean;
	qualities: string[];
	isTransmux: boolean;
	needsTranscode: boolean;
	transcodeJob: TranscodeJob | null;
}

export interface ApiResponse<T> {
	data: T | null;
	error: string | null;
}
