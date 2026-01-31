import { type EnvConfig, envSchema } from "./schema";

/**
 * Validated configuration object.
 * Throws descriptive error at startup if environment is invalid.
 */
function loadConfig(): EnvConfig {
	const env = process.env;
	const isProduction = process.env.NODE_ENV === "production";

	// In development, allow default secrets for easier local dev
	const envWithDefaults = {
		...env,
		JWT_SECRET:
			env.JWT_SECRET ??
			(isProduction ? undefined : "development-secret-key-min-32-characters-long"),
		JWT_REFRESH_SECRET:
			env.JWT_REFRESH_SECRET ??
			(isProduction ? undefined : "development-refresh-secret-key-min-32-chars"),
	};

	const result = envSchema.safeParse(envWithDefaults);

	if (!result.success) {
		const errors = result.error.issues
			.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
			.join("\n");

		throw new Error(
			`\n❌ Environment validation failed:\n${errors}\n\n` +
				"Please check your .env file or environment variables.\n" +
				"See .env.example for required configuration.\n",
		);
	}

	return result.data;
}

/**
 * Validated configuration singleton.
 * Access config values with type safety: config.JWT_SECRET, config.PORT, etc.
 */
export const config = loadConfig();

/**
 * Re-export types for use elsewhere
 */
export type { EnvConfig } from "./schema";
