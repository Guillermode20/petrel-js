import { config } from "../config";

const RATE_LIMIT_BYPASS_SYMBOL = Symbol.for("petrel.rateLimitBypass");

/**
 * Marks whether the current request should bypass rate limiting (eg: admin users).
 */
export function setRateLimitBypass(request: Request, shouldBypass: boolean): void {
	Reflect.set(request, RATE_LIMIT_BYPASS_SYMBOL, shouldBypass);
}

/**
 * Returns true when the current request has been marked to bypass rate limits.
 * Also bypasses in E2E test mode.
 */
export function shouldBypassRateLimit(request: Request): boolean {
	if (config.E2E_MODE) {
		return true;
	}
	return Boolean(Reflect.get(request, RATE_LIMIT_BYPASS_SYMBOL));
}
