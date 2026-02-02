import type { DefaultJobOptions } from "bullmq";
import { Queue } from "bullmq";
import { config } from "../config";
import { logger } from "../lib/logger";

interface QueueConfig {
	name: string;
	concurrency?: number;
	defaultJobOptions?: DefaultJobOptions;
}

const queueConfigs: Record<string, QueueConfig> = {
	transcode: {
		name: "transcode",
		concurrency: config.MAX_CONCURRENT_TRANSCODES ?? 2,
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: "exponential", delay: 5000 },
			removeOnComplete: 100,
			removeOnFail: 50,
		},
	},
	thumbnail: {
		name: "thumbnail",
		concurrency: 4,
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: "fixed", delay: 3000 },
			removeOnComplete: 200,
			removeOnFail: 100,
		},
	},
	zip: {
		name: "zip",
		concurrency: 2,
		defaultJobOptions: {
			attempts: 2,
			backoff: { type: "fixed", delay: 10000 },
			removeOnComplete: 50,
			removeOnFail: 25,
		},
	},
};

const queues: Map<string, Queue> = new Map();

export function createQueues(): void {
	if (!config.REDIS_URL) {
		logger.warn("Redis not configured, job queues will use in-memory processing");
		return;
	}

	for (const [key, queueConfig] of Object.entries(queueConfigs)) {
		try {
			const queue = new Queue(queueConfig.name, {
				connection: { url: config.REDIS_URL },
				defaultJobOptions: queueConfig.defaultJobOptions,
			});

			queues.set(key, queue);
			logger.info({ queue: queueConfig.name }, "Queue created");
		} catch (err) {
			logger.error({ err, queue: queueConfig.name }, "Failed to create queue");
		}
	}
}

export function getQueue(name: string): Queue | undefined {
	return queues.get(name);
}

export function getQueueConfig(name: string): QueueConfig | undefined {
	return queueConfigs[name];
}

export async function closeQueues(): Promise<void> {
	for (const [name, queue] of queues) {
		try {
			await queue.close();
			logger.info({ queue: name }, "Queue closed");
		} catch (err) {
			logger.error({ err, queue: name }, "Error closing queue");
		}
	}
	queues.clear();
}

export { queueConfigs };
