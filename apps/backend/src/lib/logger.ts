import pino from 'pino';
import { config } from '../config';

/**
 * Structured logger using Pino.
 * Provides consistent logging across the application with:
 * - Log levels (trace, debug, info, warn, error, fatal)
 * - JSON output for production (machine-parseable)
 * - Pretty output for development (human-readable)
 * - Request correlation IDs for tracing
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Main application logger instance
 */
export const logger = pino({
  level: config.LOG_LEVEL,
  ...(config.LOG_PRETTY && !isProduction
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  base: {
    service: 'petrel-api',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

/**
 * Create a child logger with additional context
 * Useful for adding request-specific metadata like correlation IDs
 */
export function createChildLogger(bindings: Record<string, unknown>): pino.Logger {
  return logger.child(bindings);
}

/**
 * Generate a unique correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Log levels and their intended use:
 * - trace: Very detailed debugging information
 * - debug: Debugging information useful during development
 * - info: General operational information
 * - warn: Warning conditions that might need attention
 * - error: Error conditions that should be investigated
 * - fatal: Critical errors that cause the application to stop
 */

// Export type for external use
export type Logger = pino.Logger;
