import type { File, ShareSettings } from "@petrel/shared";
import { Download, Eye, FileIcon, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SmartViewer } from "./SmartViewer";

export interface ShareFileViewProps {
	file: File;
	shareToken: string;
	password?: string;
	settings: ShareSettings;
	className?: string;
}

/**
 * ShareFileView - Single file share view
 *
 * Displays a shared file with:
 * - SmartViewer for content preview
 * - Download button (if allowed)
 * - File info: name, size, type
 * - Metadata display (if allowed)
 */
export function ShareFileView({
	file,
	shareToken,
	password,
	settings,
	className,
}: ShareFileViewProps): React.ReactNode {
	function handleDownload(): void {
		const url = api.getShareDownloadUrl(shareToken, password);
		const link = document.createElement("a");
		link.href = url;
		link.download = file.name;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	return (
		<div className={cn("flex flex-1 flex-col", className)}>
			{/* Toolbar */}
			<div className="flex items-center justify-between border-b border-border px-4 py-2">
				<FileInfo file={file} showMetadata={settings.showMetadata} />

				<div className="flex items-center gap-2">
					{settings.allowDownload && (
						<Button onClick={handleDownload} variant="secondary" size="sm">
							<Download className="mr-2 h-4 w-4" />
							Download
						</Button>
					)}
				</div>
			</div>

			{/* Content viewer */}
			<div className="flex-1 overflow-hidden">
				<SmartViewer
					file={file}
					shareToken={shareToken}
					password={password}
					settings={settings}
					className="h-full"
				/>
			</div>
		</div>
	);
}

interface FileInfoProps {
	file: File;
	showMetadata: boolean;
}

/**
 * Displays file information in the toolbar
 */
function FileInfo({ file, showMetadata }: FileInfoProps): React.ReactNode {
	return (
		<div className="flex items-center gap-3">
			<FileIcon className="h-5 w-5 text-muted-foreground" />
			<div className="flex flex-col">
				<span className="font-medium">{file.name}</span>
				{showMetadata && (
					<div className="flex items-center gap-3 text-xs text-muted-foreground">
						<span className="flex items-center gap-1">
							<HardDrive className="h-3 w-3" />
							{formatFileSize(file.size)}
						</span>
						<span className="flex items-center gap-1">
							<Eye className="h-3 w-3" />
							{file.mimeType}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * Formats file size for display
 */
function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}
