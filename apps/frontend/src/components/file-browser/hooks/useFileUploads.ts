import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useUploadFile } from "@/hooks";
import type { UploadProgress } from "../types";

interface UseFileUploadsOptions {
	folderId?: number;
}

interface UseFileUploadsReturn {
	uploads: UploadProgress[];
	addUploads: (files: FileList) => Promise<void>;
	removeUpload: (file: globalThis.File) => void;
	cancelUpload: (file: globalThis.File) => void;
	isUploading: boolean;
}

/**
 * Manages upload queue state and progress for file uploads.
 * Uses the existing useUploadFile hook for the actual upload operation.
 */
export function useFileUploads(options: UseFileUploadsOptions): UseFileUploadsReturn {
	const { folderId } = options;
	const [uploads, setUploads] = useState<UploadProgress[]>([]);
	const uploadMutation = useUploadFile();

	const isUploading = uploads.some((u) => u.status === "uploading");

	const addUploads = useCallback(
		async (files: FileList) => {
			const fileArray = Array.from(files);
			const newUploads: UploadProgress[] = fileArray.map((file) => ({
				file,
				progress: 0,
				status: "pending" as const,
			}));
			setUploads((prev) => [...prev, ...newUploads]);

			for (const file of fileArray) {
				setUploads((prev) =>
					prev.map((u) => (u.file === file ? { ...u, status: "uploading" as const } : u)),
				);

				try {
					await uploadMutation.mutateAsync({
						file,
						folderId,
						onProgress: (progress) => {
							setUploads((prev) => prev.map((u) => (u.file === file ? { ...u, progress } : u)));
						},
					});
					setUploads((prev) =>
						prev.map((u) =>
							u.file === file ? { ...u, status: "completed" as const, progress: 100 } : u,
						),
					);
				} catch (error) {
					setUploads((prev) =>
						prev.map((u) =>
							u.file === file
								? { ...u, status: "error" as const, error: (error as Error).message }
								: u,
						),
					);
				}
			}
		},
		[uploadMutation, folderId],
	);

	const removeUpload = useCallback((file: globalThis.File) => {
		setUploads((prev) => prev.filter((u) => u.file !== file));
	}, []);

	const cancelUpload = useCallback((file: globalThis.File) => {
		setUploads((prev) => {
			const upload = prev.find((u) => u.file === file);
			if (!upload) return prev;

			if (upload.status === "uploading") {
				toast.error("Upload cancel is not supported yet");
				return prev;
			}

			return prev.filter((u) => u.file !== file);
		});
	}, []);

	return {
		uploads,
		addUploads,
		removeUpload,
		cancelUpload,
		isUploading,
	};
}
