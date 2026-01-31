import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { config } from "./src/config";
import { createChildLogger, generateCorrelationId, logger } from "./src/lib/logger";
import { closeRedis, initRedis } from "./src/lib/redis";
import { audioRoutes } from "./src/modules/audio";
import { authRoutes } from "./src/modules/auth";
import { fileRoutes } from "./src/modules/files";
import { shareRoutes } from "./src/modules/shares";
import { streamRoutes } from "./src/modules/stream";

// Initialize Redis (optional caching layer)
initRedis();

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
	// File routes
	.use(fileRoutes)
	// Stream routes
	.use(streamRoutes)
	// Audio routes
	.use(audioRoutes)
	// Share routes
	.use(shareRoutes)
	.listen(config.PORT);

logger.info({ port: app.server?.port, hostname: app.server?.hostname }, "🦊 Elysia server started");
logger.info(
	{ url: `http://${app.server?.hostname}:${app.server?.port}/swagger` },
	"📚 Swagger documentation available",
);

// Graceful shutdown
process.on("SIGINT", async () => {
	logger.info("Shutting down gracefully...");
	await closeRedis();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	logger.info("Shutting down gracefully...");
	await closeRedis();
	process.exit(0);
});
