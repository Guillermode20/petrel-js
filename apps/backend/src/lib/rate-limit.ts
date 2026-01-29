import { Elysia } from 'elysia';
import { rateLimit } from 'elysia-rate-limit';
import { logger } from './logger';

/**
 * Rate limiting configurations for different endpoint types.
 * Provides protection against abuse while allowing legitimate usage.
 */

/**
 * Rate limiting for file upload endpoints
 * 10 uploads per minute per IP
 */
export const uploadRateLimit = new Elysia({ name: 'upload-rate-limit' }).use(
  rateLimit({
    duration: 60 * 1000, // 1 minute
    max: 10,
    generator: (request) => {
      // Use IP-based limiting
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
      return `upload:${ip}`;
    },
    headers: true, // Include X-RateLimit-* headers
  })
);

/**
 * Rate limiting for stream endpoints
 * 100 requests per minute per IP (allows burst for seeking)
 */
export const streamRateLimit = new Elysia({ name: 'stream-rate-limit' }).use(
  rateLimit({
    duration: 60 * 1000, // 1 minute
    max: 100,
    generator: (request) => {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
      return `stream:${ip}`;
    },
    headers: true,
  })
);

/**
 * Rate limiting for share token validation
 * 30 requests per minute per IP (prevents brute force on share tokens)
 */
export const shareRateLimit = new Elysia({ name: 'share-rate-limit' }).use(
  rateLimit({
    duration: 60 * 1000, // 1 minute
    max: 30,
    generator: (request) => {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
      return `share:${ip}`;
    },
    headers: true,
  })
);

/**
 * Rate limiting for general API requests
 * 60 requests per minute per IP
 */
export const generalRateLimit = new Elysia({ name: 'general-rate-limit' }).use(
  rateLimit({
    duration: 60 * 1000, // 1 minute
    max: 60,
    generator: (request) => {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
      return `general:${ip}`;
    },
    headers: true,
  })
);

/**
 * Create a custom rate limiter with specified limits
 */
export function createRateLimiter(options: {
  name: string;
  duration: number;
  max: number;
  keyPrefix: string;
}): ReturnType<typeof rateLimit> {
  return rateLimit({
    duration: options.duration,
    max: options.max,
    generator: (request) => {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
      return `${options.keyPrefix}:${ip}`;
    },
    headers: true,
  });
}
