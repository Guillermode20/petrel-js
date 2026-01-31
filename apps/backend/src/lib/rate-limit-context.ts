const RATE_LIMIT_BYPASS_SYMBOL = Symbol.for("petrel.rateLimitBypass");

/**
 * Marks whether the current request should bypass rate limiting (eg: admin users).
 */
export function setRateLimitBypass(request: Request, shouldBypass: boolean): void {
	Reflect.set(request, RATE_LIMIT_BYPASS_SYMBOL, shouldBypass);
}

/**
 * Returns true when the current request has been marked to bypass rate limits.
 */
export function shouldBypassRateLimit(request: Request): boolean {
	return Boolean(Reflect.get(request, RATE_LIMIT_BYPASS_SYMBOL));
}
