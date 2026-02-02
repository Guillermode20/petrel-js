import type { File, Folder } from "@petrel/shared";

export interface EventPayload {
	timestamp: number;
	correlationId?: string;
}

export interface FileCreatedEvent extends EventPayload {
	file: File;
}

export interface FileDeletedEvent extends EventPayload {
	fileId: number;
	path: string;
}

export interface FileUpdatedEvent extends EventPayload {
	file: File;
	changes: Partial<File>;
}

export interface FolderCreatedEvent extends EventPayload {
	folder: Folder;
}

export interface FolderDeletedEvent extends EventPayload {
	folderId: number;
	path: string;
}

export interface MetadataExtractedEvent extends EventPayload {
	fileId: number;
	metadata: Record<string, unknown>;
}

export interface TranscodeRequestedEvent extends EventPayload {
	fileId: number;
	requestedBy: number | null;
}

export interface TranscodeCompletedEvent extends EventPayload {
	fileId: number;
	jobId: number;
	success: boolean;
	error?: string;
}

export interface ThumbnailRequestedEvent extends EventPayload {
	fileId: number;
}

export interface ThumbnailCompletedEvent extends EventPayload {
	fileId: number;
	success: boolean;
}

export interface ZipRequestedEvent extends EventPayload {
	jobId: number;
	entries: Array<{ fileId?: number; folderId?: number }>;
	requestedBy: number | null;
}

export interface ZipCompletedEvent extends EventPayload {
	jobId: number;
	success: boolean;
	error?: string;
}

export interface PetrelEventsMap {
	"file:created": FileCreatedEvent;
	"file:deleted": FileDeletedEvent;
	"file:updated": FileUpdatedEvent;
	"folder:created": FolderCreatedEvent;
	"folder:deleted": FolderDeletedEvent;
	"metadata:extracted": MetadataExtractedEvent;
	"transcode:requested": TranscodeRequestedEvent;
	"transcode:completed": TranscodeCompletedEvent;
	"thumbnail:requested": ThumbnailRequestedEvent;
	"thumbnail:completed": ThumbnailCompletedEvent;
	"zip:requested": ZipRequestedEvent;
	"zip:completed": ZipCompletedEvent;
}

export type PetrelEventName = keyof PetrelEventsMap;

export type PetrelEventPayload<T extends PetrelEventName> = PetrelEventsMap[T];

export type EventHandler<T extends PetrelEventName> = (
	payload: PetrelEventPayload<T>,
) => void | Promise<void>;
