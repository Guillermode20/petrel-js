import { logger } from "../lib/logger";
import type { EventHandler, PetrelEventName, PetrelEventPayload } from "./types";

class EventBus {
	private handlers: Map<PetrelEventName, Set<EventHandler<PetrelEventName>>> = new Map();

	private getHandlers<T extends PetrelEventName>(event: T): Set<EventHandler<T>> {
		if (!this.handlers.has(event)) {
			this.handlers.set(event, new Set());
		}
		return this.handlers.get(event) as Set<EventHandler<T>>;
	}

	on<T extends PetrelEventName>(event: T, handler: EventHandler<T>): () => void {
		const handlers = this.getHandlers(event);
		handlers.add(handler as EventHandler<PetrelEventName>);

		logger.debug({ event }, "Event handler registered");

		return () => {
			handlers.delete(handler as EventHandler<PetrelEventName>);
			logger.debug({ event }, "Event handler unregistered");
		};
	}

	once<T extends PetrelEventName>(event: T, handler: EventHandler<T>): void {
		const unsubscribe = this.on(event, async (payload) => {
			unsubscribe();
			await handler(payload);
		});
	}

	emit<T extends PetrelEventName>(event: T, payload: PetrelEventPayload<T>): void {
		const handlers = this.getHandlers(event);

		if (handlers.size === 0) {
			logger.debug({ event }, "No handlers for event");
			return;
		}

		logger.debug({ event, handlerCount: handlers.size }, "Emitting event");

		for (const handler of handlers) {
			try {
				const result = handler(payload as unknown as PetrelEventPayload<PetrelEventName>);
				if (result instanceof Promise) {
					result.catch((err) => {
						logger.error({ err, event }, "Async event handler failed");
					});
				}
			} catch (err) {
				logger.error({ err, event }, "Event handler failed");
			}
		}
	}

	async emitAsync<T extends PetrelEventName>(
		event: T,
		payload: PetrelEventPayload<T>,
	): Promise<void> {
		const handlers = this.getHandlers(event);

		if (handlers.size === 0) {
			logger.debug({ event }, "No handlers for event");
			return;
		}

		logger.debug({ event, handlerCount: handlers.size }, "Emitting event async");

		const promises: Promise<void>[] = [];
		for (const handler of handlers) {
			try {
				const result = handler(payload as unknown as PetrelEventPayload<PetrelEventName>);
				if (result instanceof Promise) {
					promises.push(
						result.catch((err) => {
							logger.error({ err, event }, "Async event handler failed");
						}),
					);
				}
			} catch (err) {
				logger.error({ err, event }, "Event handler failed");
			}
		}

		await Promise.all(promises);
	}

	removeAllHandlers(event?: PetrelEventName): void {
		if (event) {
			this.handlers.delete(event);
			logger.debug({ event }, "All handlers removed for event");
		} else {
			this.handlers.clear();
			logger.debug("All event handlers removed");
		}
	}

	getHandlerCount(event?: PetrelEventName): number {
		if (event) {
			return this.getHandlers(event).size;
		}
		let total = 0;
		for (const handlers of this.handlers.values()) {
			total += handlers.size;
		}
		return total;
	}
}

export const eventBus = new EventBus();

export function createEventPayload<T extends Record<string, unknown>>(
	data: T,
	correlationId?: string,
): T & { timestamp: number; correlationId?: string } {
	return {
		...data,
		timestamp: Date.now(),
		correlationId,
	};
}
