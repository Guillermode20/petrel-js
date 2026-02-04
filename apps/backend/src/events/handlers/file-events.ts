import { logger } from "../../lib/logger";
import { metadataService } from "../../services/metadata.service";
import { transcodeQueue } from "../../services/transcode.service";
import { eventBus } from "../bus";
import type { FileCreatedEvent, MetadataExtractedEvent } from "../types";

export function registerFileEventHandlers(): void {
	// When a file is created, extract metadata
	eventBus.on("file:created", async (event: FileCreatedEvent) => {
		logger.debug({ fileId: event.file.id }, "File created event received");

		try {
			await metadataService.enrichMetadata(event.file);
		} catch (err) {
			logger.error({ err, fileId: event.file.id }, "Failed to extract metadata");
		}
	});

	// When metadata is extracted, queue transcoding for video files
	eventBus.on("metadata:extracted", async (event: MetadataExtractedEvent) => {
		logger.debug({ fileId: event.fileId }, "Metadata extracted event received");

		const metadata = event.metadata;
		if (metadata?.type === "video") {
			try {
				await transcodeQueue.queueTranscode(event.fileId, "720p");
			} catch (err) {
				logger.error({ err, fileId: event.fileId }, "Failed to queue transcode");
			}
		}
	});

	logger.info("File event handlers registered");
}

export function unregisterFileEventHandlers(): void {
	eventBus.removeAllHandlers("file:created");
	eventBus.removeAllHandlers("metadata:extracted");
	logger.info("File event handlers unregistered");
}
