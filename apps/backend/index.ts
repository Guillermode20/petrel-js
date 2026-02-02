import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { cacheManager } from "./src/cache";
import { config } from "./src/config";
import { createChildLogger, generateCorrelationId, logger } from "./src/lib/logger";
import { closeRedis, initRedis } from "./src/lib/redis";
import { adminRoutes } from "./src/modules/admin";
import { audioRoutes } from "./src/modules/audio";
import { authRoutes } from "./src/modules/auth";
import { fileRoutes } from "./src/modules/files";
import { settingsRoutes } from "./src/modules/settings";
import { setupRoutes } from "./src/modules/setup";
import { shareRoutes } from "./src/modules/shares";
import { streamRoutes } from "./src/modules/stream";
import { userRoutes } from "./src/modules/users";
import { closeQueues, createQueues } from "./src/queues/connection";
import { registerFileEventHandlers, unregisterFileEventHandlers } from "./src/events";
import { storageSyncService } from "./src/services/storage-sync.service";
import { closeTranscodeWorker, createTranscodeWorker } from "./src/workers/transcode.worker";
import { closeZipWorker, createZipWorker } from "./src/workers/zip.worker";

// Track workers for cleanup
let transcodeWorker: ReturnType<typeof createTranscodeWorker> = null;
let zipWorker: ReturnType<typeof createZipWorker> = null;

// Initialize Redis (optional caching layer)
initRedis();

// Initialize cache manager (uses Redis if available, otherwise memory)
cacheManager.initialize();

// Initialize job queues
createQueues();

// Register event handlers
registerFileEventHandlers();

// Initialize workers if Redis is configured
if (config.REDIS_URL) {
	transcodeWorker = createTranscodeWorker();
	zipWorker = createZipWorker();
	logger.info("Job workers initialized");
} else {
	logger.info(
		"Redis not configured, skipping job worker initialization (using in-memory processing)",
	);
}

async function runStartupSyncChecks(): Promise<void> {
	try {
		const importReport = await storageSyncService.autoImportIfDatabaseEmpty({
			enrichMetadata: false,
		});
		if (importReport) {
			logger.warn(
				{
					createdFolderCount: importReport.createdFolderCount,
					importedFileCount: importReport.importedFileCount,
					errors: importReport.errors.length,
				},
				"Database was empty; imported files from storage",
			);
		}

		const report = await storageSyncService.validateSync();
		const hasOrphanedDiskFiles = report.orphanedFilesOnDisk.length > 0;
		const hasOrphanedDbRecords = report.orphanedDbFileIds.length > 0;

		if (hasOrphanedDiskFiles) {
			logger.warn(
				{
					orphanedFilesOnDisk: report.orphanedFilesOnDisk.length,
				},
				"Auto-repairing orphaned files on disk",
			);
			const repairReport = await storageSyncService.importOrphanedFiles({ enrichMetadata: false });
			logger.info(
				{
					importedFileCount: repairReport.importedFileCount,
					errors: repairReport.errors.length,
				},
				"Auto-repair completed",
			);
		}

		if (hasOrphanedDbRecords) {
			logger.warn(
				{
					orphanedDbFileIds: report.orphanedDbFileIds.length,
				},
				"Found orphaned database records (files missing on disk)",
			);
		}
	} catch (err) {
		logger.error(
			{ error: err instanceof Error ? err.message : String(err) },
			"Startup storage/database sync check failed",
		);
	}
}

void runStartupSyncChecks();

const app = new Elysia()
	// Request logging middleware with correlation IDs
	.derive(({ headers }) => {
		const correlationId = (headers["x-correlation-id"] as string) ?? generateCorrelationId();
		return {
			correlationId,
			log: createChildLogger({ correlationId }),
		};
	})
	.onAfterHandle(({ request, set, correlationId, log }) => {
		const status = typeof set.status === "number" ? set.status : 200;
		// Only log non-auth errors and successful requests
		if (status < 400 || status === 401) {
			log.debug(
				{
					method: request.method,
					url: request.url,
					status,
				},
				status === 401 ? "Unauthorized request" : "Request completed",
			);
		} else {
			log.info(
				{
					method: request.method,
					url: request.url,
					status,
				},
				"Request completed",
			);
		}
	})
	.onError(({ error, request, log, set }) => {
		if (!log) return;

		const isUnauthorized =
			error instanceof Error &&
			(error.message === "Unauthorized" || error.message.includes("Unauthorized"));
		const currentStatus = typeof set.status === "number" ? set.status : undefined;
		const status = currentStatus ?? (isUnauthorized ? 401 : 500);
		set.status = status;

		// Don't log 401 Unauthorized responses as errors - they're expected for unauthenticated requests
		if (status === 401) {
			log.debug(
				{
					method: request.method,
					url: request.url,
					status: 401,
				},
				"Unauthorized request",
			);
			return;
		}

		log.error(
			{
				method: request.method,
				url: request.url,
				error: error instanceof Error ? error.message : String(error),
			},
			"Request error",
		);
	})
	.use(
		swagger({
			documentation: {
				info: {
					title: "Petrel API",
					version: "1.0.0",
					description:
						"A fileserver built for simplicity with a focus on effortless sharing of videos and photo albums.",
				},
				tags: [
					{ name: "Authentication", description: "Auth endpoints" },
					{ name: "Files", description: "File management endpoints" },
					{ name: "Shares", description: "Share link management" },
					{ name: "Stream", description: "Media streaming endpoints" },
					{ name: "Settings", description: "User settings management" },
				],
			},
		}),
	)
	.use(
		cors({
			origin: config.FRONTEND_URL,
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"],
			credentials: true,
		}),
	)
	// Health check endpoint
	.get("/", () => ({
		message: "Hello World from Elysia Backend!",
	}))
	.get("/api/hello", () => ({
		message: "Hello World from Elysia Backend!",
		timestamp: new Date().toISOString(),
	}))
	// Auth routes
	.use(authRoutes)
	// Setup routes (must be before user routes to allow first-time admin creation)
	.use(setupRoutes)
	// File routes
	.use(fileRoutes)
	// Stream routes
	.use(streamRoutes)
	// Audio routes
	.use(audioRoutes)
	// Share routes
	.use(shareRoutes)
	// Settings routes
	.use(settingsRoutes)
	// Admin routes
	.use(adminRoutes)
	// User routes
	.use(userRoutes)
	.listen(config.PORT);

logger.info({ port: app.server?.port, hostname: app.server?.hostname }, "🦊 Elysia server started");
logger.info(
	{ url: `http://${app.server?.hostname}:${app.server?.port}/swagger` },
	"📚 Swagger documentation available",
);

// Graceful shutdown
process.on("SIGINT", async () => {
	logger.info("Shutting down gracefully...");
	unregisterFileEventHandlers();
	await closeTranscodeWorker(transcodeWorker);
	await closeZipWorker(zipWorker);
	await closeQueues();
	await closeRedis();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	logger.info("Shutting down gracefully...");
	unregisterFileEventHandlers();
	await closeTranscodeWorker(transcodeWorker);
	await closeZipWorker(zipWorker);
	await closeQueues();
	await closeRedis();
	process.exit(0);
});
