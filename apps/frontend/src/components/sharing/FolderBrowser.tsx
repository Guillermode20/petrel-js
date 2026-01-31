import type { File, Folder, ShareSettings } from "@petrel/shared";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BreadcrumbItem } from "./SharedFileBrowser";
import { SharedFileBrowser } from "./SharedFileBrowser";
import { SmartViewer } from "./SmartViewer";
import { api } from "@/lib/api";

export interface FolderBrowserProps {
	folder: Folder;
	files: File[];
	folders: Folder[];
	shareToken: string;
	password?: string;
	settings: ShareSettings;
	onDownloadZip?: (fileIds: number[]) => void;
	className?: string;
}

interface FolderNavigationState {
	folder: Folder;
	files: File[];
	folders: Folder[];
}

/**
 * FolderBrowser - File browser for shared folders with subfolder navigation
 *
 * Uses SharedFileBrowser (which reuses the existing FileGrid/FileList from the regular files UI)
 * for displaying files and folders. Shows SmartViewer when a file is selected for preview.
 *
 * Supports navigation into subfolders by fetching their contents from the API.
 */
export function FolderBrowser({
	folder: initialFolder,
	files: initialFiles,
	folders: initialFolders,
	shareToken,
	password,
	settings,
	onDownloadZip,
	className,
}: FolderBrowserProps): React.ReactNode {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	// Navigation stack: array of folder states from root to current
	const [navStack, setNavStack] = useState<FolderNavigationState[]>([
		{ folder: initialFolder, files: initialFiles, folders: initialFolders },
	]);

	// Current folder is the last item in the stack
	const currentState = navStack[navStack.length - 1]!;
	const { folder: currentFolder, files: currentFiles, folders: currentFolders } = currentState;

	// Build breadcrumb path from navigation stack (excluding current folder)
	const breadcrumbPath: BreadcrumbItem[] = navStack.slice(0, -1).map((state, index) => ({
		folder: state.folder,
		index: index + 1,
	}));

	// Mutation to fetch subfolder contents
	const subfolderMutation = useMutation({
		mutationFn: async (folderId: number) => {
			return api.getShareSubfolder(shareToken, folderId, password);
		},
		onSuccess: (data) => {
			if (data.content && "path" in data.content) {
				setNavStack((prev) => [
					...prev,
					{
						folder: data.content as Folder,
						files: data.files ?? [],
						folders: data.folders ?? [],
					},
				]);
			}
		},
	});

	// Handle folder open - fetch subfolder contents
	const handleFolderOpen = (folder: Folder) => {
		subfolderMutation.mutate(folder.id);
	};

	// Handle breadcrumb navigation - pop back to the selected level
	const handleBreadcrumbClick = (index: number) => {
		// index 0 means root (reset to single item), otherwise slice to index
		const newStack = index === 0 ? [navStack[0]!] : navStack.slice(0, index + 1) as FolderNavigationState[];
		setNavStack(newStack);
	};

	// If a file is selected, show the preview
	if (selectedFile) {
		return (
			<div className="flex h-full flex-col">
				<div className="flex items-center border-b border-border px-4 h-10">
					<Button variant="ghost" className="h-6 px-2" onClick={() => setSelectedFile(null)}>
						Back to folder
					</Button>
				</div>
				<div className="flex-1 overflow-hidden">
					<SmartViewer
						file={selectedFile}
						shareToken={shareToken}
						password={password}
						settings={settings}
						className="h-full"
					/>
				</div>
			</div>
		);
	}

	return (
		<SharedFileBrowser
			folder={currentFolder}
			files={currentFiles}
			folders={currentFolders}
			shareToken={shareToken}
			password={password}
			settings={settings}
			onFileOpen={setSelectedFile}
			onFolderOpen={handleFolderOpen}
			breadcrumbPath={breadcrumbPath}
			onBreadcrumbClick={handleBreadcrumbClick}
			onDownloadZip={onDownloadZip}
			className={className}
		/>
	);
}
