import type { File } from "@petrel/shared";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect } from "react";
import { FilePreview } from "@/components/viewers/file-preview";
import { isFile, useFile, useFiles } from "@/hooks";

export const Route = createFileRoute("/files/preview/$fileId")({
	component: FilePreviewPage,
	validateSearch: (search: Record<string, unknown>) => ({
		fromFolder: typeof search.fromFolder === "string" ? search.fromFolder : undefined,
	}),
});

function FilePreviewPage() {
	const { fileId } = Route.useParams();
	const navigate = useNavigate();
	const search = Route.useSearch();
	const numericFileId = parseInt(fileId, 10);

	const { data: file, isLoading: fileLoading, error: fileError } = useFile(numericFileId);

	// Get sibling files for navigation
	const parentId = file?.parentId ?? null;
	const { data: filesResponse } = useFiles(parentId ? { folderId: parentId } : undefined);

	// Filter to only include files (not folders) and sort for consistent navigation
	const siblingFiles =
		filesResponse?.items.filter(isFile).sort((a: File, b: File) => a.name.localeCompare(b.name)) ??
		[];

	const handleNavigate = useCallback(
		(direction: "prev" | "next") => {
			const currentIndex = siblingFiles.findIndex((f: File) => f.id === numericFileId);
			if (currentIndex === -1) return;

			const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
			const newFile = siblingFiles[newIndex];

			if (newFile) {
				navigate({
					to: "/files/preview/$fileId",
					params: { fileId: String(newFile.id) },
					search: { fromFolder: search.fromFolder },
				});
			}
		},
		[siblingFiles, numericFileId, navigate, search.fromFolder],
	);

	const handleClose = useCallback(() => {
		// Use fromFolder search param if available, otherwise fall back to file's parentId
		const targetFolderId = search.fromFolder
			? parseInt(search.fromFolder, 10)
			: (file?.parentId ?? null);

		if (targetFolderId) {
			navigate({
				to: "/files/$folderId",
				params: { folderId: String(targetFolderId) },
			});
		} else {
			navigate({ to: "/files" });
		}
	}, [search.fromFolder, file?.parentId, navigate]);

	// Keyboard shortcuts
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent): void {
			if (e.key === "Escape") {
				handleClose();
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleClose]);

	if (fileLoading) {
		return (
			<div className="flex h-full flex-col">
				<div className="flex items-center justify-end border-b border-border px-4 py-2">
					<button
						onClick={handleClose}
						className="rounded p-2 hover:bg-secondary"
						aria-label="Close"
					>
						<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</div>
		);
	}

	if (fileError || !file) {
		return (
			<div className="flex h-full flex-col">
				<div className="flex items-center justify-end border-b border-border px-4 py-2">
					<button
						onClick={handleClose}
						className="rounded p-2 hover:bg-secondary"
						aria-label="Close"
					>
						<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
				<div className="flex flex-1 flex-col items-center justify-center gap-4">
					<p className="text-lg font-medium">File not found</p>
					<p className="text-sm text-muted-foreground">
						The file you're looking for doesn't exist or has been deleted.
					</p>
				</div>
			</div>
		);
	}

	return (
		<FilePreview
			file={file}
			files={siblingFiles}
			onNavigate={handleNavigate}
			onClose={handleClose}
			className="h-full"
		/>
	);
}
