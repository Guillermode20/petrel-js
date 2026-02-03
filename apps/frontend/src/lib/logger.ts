type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
	private isDev = import.meta.env.DEV;

	private log(level: LogLevel, ...args: unknown[]) {
		if (!this.isDev) return;

		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}][${level.toUpperCase()}]`;
		console[level](prefix, ...args);
	}

	debug(...args: unknown[]) {
		this.log("debug", ...args);
	}

	info(...args: unknown[]) {
		this.log("info", ...args);
	}

	warn(...args: unknown[]) {
		this.log("warn", ...args);
	}

	error(...args: unknown[]) {
		this.log("error", ...args);
	}
}

export const logger = new Logger();
