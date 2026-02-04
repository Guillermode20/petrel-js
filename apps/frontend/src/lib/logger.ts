type LogLevel = "debug" | "info" | "warn" | "error";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

class Logger {
	private isDev = import.meta.env.DEV;

	private async sendToBackend(level: LogLevel, message: string, context?: unknown) {
		// Don't send debug logs to backend to save bandwidth
		if (level === "debug") return;

		try {
			const body = JSON.stringify({
				level,
				message,
				context,
				timestamp: new Date().toISOString(),
			});

			// Use fetch directly to avoid circular dependency with api.ts
			// and use keepalive to ensure logs are sent even if page unloads
			await fetch(`${API_BASE}/logs`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body,
				keepalive: true,
			});
		} catch (err) {
			// Fallback to console if backend logging fails
			// We intentionally don't try to log this error to avoid infinite loops
			if (this.isDev) {
				console.error("Failed to send log to backend:", err);
			}
		}
	}

	private log(level: LogLevel, message: string, ...args: unknown[]) {
		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}][${level.toUpperCase()}]`;
		
		// Always log to console in dev, or if it's an error/warn
		if (this.isDev || level === "error" || level === "warn") {
			console[level](prefix, message, ...args);
		}

		// Prepare context for backend
		const context = args.length === 1 ? args[0] : (args.length > 0 ? args : undefined);
		
		// Send to backend (fire and forget)
		void this.sendToBackend(level, message, context);
	}

	debug(message: string, ...args: unknown[]) {
		this.log("debug", message, ...args);
	}

	info(message: string, ...args: unknown[]) {
		this.log("info", message, ...args);
	}

	warn(message: string, ...args: unknown[]) {
		this.log("warn", message, ...args);
	}

	error(message: string, ...args: unknown[]) {
		this.log("error", message, ...args);
	}
}

export const logger = new Logger();