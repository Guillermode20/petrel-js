import { logger } from "../../lib/logger";
import { eventBus } from "../bus";
import type { ShareCreatedEvent, ShareDeletedEvent, ShareUpdatedEvent } from "../types";

export function registerShareEventHandlers(): void {
	eventBus.on("share:created", async (event: ShareCreatedEvent) => {
		logger.debug(
			{ shareId: event.share.id, token: event.share.token },
			"Share created event received",
		);
	});

	eventBus.on("share:updated", async (event: ShareUpdatedEvent) => {
		logger.debug(
			{ shareId: event.share.id, token: event.share.token },
			"Share updated event received",
		);
	});

	eventBus.on("share:deleted", async (event: ShareDeletedEvent) => {
		logger.debug({ shareId: event.shareId, token: event.token }, "Share deleted event received");
	});

	logger.info("Share event handlers registered");
}

export function unregisterShareEventHandlers(): void {
	eventBus.removeAllHandlers("share:created");
	eventBus.removeAllHandlers("share:updated");
	eventBus.removeAllHandlers("share:deleted");
	logger.info("Share event handlers unregistered");
}
