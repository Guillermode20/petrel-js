declare module "archiver" {
	import { Writable } from "node:stream";

	interface ArchiverOptions {
		zlib?: {
			level?: number;
		};
	}

	interface EntryData {
		name?: string;
		prefix?: string;
		date?: Date;
		mode?: number;
	}

	interface ProgressData {
		fs: {
			processedBytes: number;
			totalBytes: number;
		};
	}

	interface Archiver extends Writable {
		file(filepath: string, data?: EntryData): this;
		glob(pattern: string, options?: unknown, data?: EntryData): this;
		abort(): this;
		finalize(): Promise<void>;
		on(event: "error", listener: (error: Error) => void): this;
		on(event: "progress", listener: (data: ProgressData) => void): this;
		on(event: "close", listener: () => void): this;
		on(event: string, listener: (...args: unknown[]) => void): this;
		pipe<T extends Writable>(destination: T): T;
	}

	function create(format: string, options?: ArchiverOptions): Archiver;
	export = create;
}
