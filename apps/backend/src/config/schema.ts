import { z } from "zod";

/**
 * Environment variable validation schema using Zod.
 * Validates all required and optional configuration at startup.
 */
export const envSchema = z.object({
	// JWT Configuration (Required)
	JWT_SECRET: z
		.string()
		.min(32, "JWT_SECRET must be at least 32 characters")
		.refine((val) => val !== "your-secret-key-change-in-production", {
			message: "JWT_SECRET must be changed from default value in production",
		}),
	JWT_REFRESH_SECRET: z
		.string()
		.min(32, "JWT_REFRESH_SECRET must be at least 32 characters")
		.refine((val) => val !== "your-refresh-secret-change-in-production", {
			message: "JWT_REFRESH_SECRET must be changed from default value in production",
		}),

	// Server Configuration
	PORT: z
		.string()
		.transform((val) => parseInt(val, 10))
		.pipe(z.number().int().positive().max(65535))
		.default("4000"),
	FRONTEND_URL: z.string().url().default("http://localhost:3000"),

	// Database
	DATABASE_PATH: z.string().default("./petrel.db"),

	// Storage
	STORAGE_PATH: z.string().default("./storage"),

	// Redis (Optional)
	REDIS_URL: z.string().url().optional().or(z.literal("")),

	// Transcoding
	MAX_CONCURRENT_TRANSCODES: z
		.string()
		.transform((val) => parseInt(val, 10))
		.pipe(z.number().int().positive().max(10))
		.default("2"),
	AUDIO_TRANSCODE_FLAC: z
		.string()
		.transform((val) => val === "true")
		.default("false"),
	AUDIO_OPUS_BITRATE_KBPS: z
		.string()
		.transform((val) => parseInt(val, 10))
		.pipe(z.number().int().min(64).max(512))
		.default("160"),

	// Guest Access
	PETREL_GUEST_ACCESS: z
		.string()
		.transform((val) => val === "true")
		.default("false"),

	// Logging
	LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
	LOG_PRETTY: z
		.string()
		.transform((val) => val === "true")
		.default("true"),
});

export type EnvConfig = z.infer<typeof envSchema>;
