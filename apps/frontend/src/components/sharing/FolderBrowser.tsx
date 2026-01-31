import type { File, Folder, ShareSettings } from "@petrel/shared";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SharedFileBrowser } from "./SharedFileBrowser";
import { SmartViewer } from "./SmartViewer";

export interface FolderBrowserProps {
	folder: Folder;
	files: File[];
	folders: Folder[];
	shareToken: string;
	password?: string;
	settings: ShareSettings;
	className?: string;
}

/**
 * FolderBrowser - File browser for shared folders
 *
 * Uses SharedFileBrowser (which reuses the existing FileGrid/FileList from the regular files UI)
 * for displaying files and folders. Shows SmartViewer when a file is selected for preview.
 *
 * Note: Folder navigation is not currently supported for shares as the API doesn't provide
 * subfolder contents. Only the top-level folder contents are displayed.
 */
export function FolderBrowser({
	folder,
	files,
	folders,
	shareToken,
	password,
	settings,
	className,
}: FolderBrowserProps): React.ReactNode {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	// If a file is selected, show the preview
	if (selectedFile) {
		return (
			<div className="flex h-full flex-col">
				<div className="flex items-center justify-between border-b border-border px-4 py-2">
					<Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
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
			folder={folder}
			files={files}
			folders={folders}
			shareToken={shareToken}
			password={password}
			settings={settings}
			onFileOpen={setSelectedFile}
			onFolderOpen={() => {}}
			className={className}
		/>
	);
}
