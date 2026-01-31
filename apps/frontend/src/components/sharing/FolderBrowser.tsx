import type { File, Folder, ShareSettings } from "@petrel/shared";
import { Download, FileIcon, FolderIcon, Grid, HardDrive, List } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getPreviewType } from "../viewers/file-preview/utils";
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

type ViewType = "grid" | "list";

/**
 * FolderBrowser - File grid/list for shared folders
 *
 * Features:
 * - Grid/list view toggle
 * - File preview on click
 * - Download buttons (if allowed)
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
	const [viewType, setViewType] = useState<ViewType>("grid");
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
		<div className={cn("flex flex-1 flex-col", className)}>
			{/* Toolbar */}
			<div className="flex items-center justify-between border-b border-border px-4 py-2">
				<div className="flex items-center gap-2">
					<FolderIcon className="h-4 w-4 text-muted-foreground" />
					<span className="font-medium">{folder.name}</span>
					<span className="text-sm text-muted-foreground">
						({files.length} files, {folders.length} folders)
					</span>
				</div>

				<div className="flex items-center gap-1">
					<Button
						variant={viewType === "grid" ? "secondary" : "ghost"}
						size="icon"
						onClick={() => setViewType("grid")}
					>
						<Grid className="h-4 w-4" />
					</Button>
					<Button
						variant={viewType === "list" ? "secondary" : "ghost"}
						size="icon"
						onClick={() => setViewType("list")}
					>
						<List className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-auto p-4">
				{viewType === "grid" ? (
					<GridView
						files={files}
						shareToken={shareToken}
						password={password}
						settings={settings}
						onFileClick={setSelectedFile}
					/>
				) : (
					<ListView
						files={files}
						shareToken={shareToken}
						password={password}
						settings={settings}
						onFileClick={setSelectedFile}
					/>
				)}
			</div>
		</div>
	);
}

interface FileListProps {
	files: File[];
	shareToken: string;
	password?: string;
	settings: ShareSettings;
	onFileClick: (file: File) => void;
}

/**
 * Grid view of files
 */
function GridView({
	files,
	shareToken,
	password,
	settings,
	onFileClick,
}: FileListProps): React.ReactNode {
	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
			{files.map((file) => (
				<FileGridItem
					key={file.id}
					file={file}
					shareToken={shareToken}
					password={password}
					settings={settings}
					onClick={() => onFileClick(file)}
				/>
			))}
		</div>
	);
}

/**
 * List view of files
 */
function ListView({
	files,
	shareToken,
	password,
	settings,
	onFileClick,
}: FileListProps): React.ReactNode {
	return (
		<div className="flex flex-col gap-1">
			{files.map((file) => (
				<FileListItem
					key={file.id}
					file={file}
					shareToken={shareToken}
					password={password}
					settings={settings}
					onClick={() => onFileClick(file)}
				/>
			))}
		</div>
	);
}

interface FileItemProps {
	file: File;
	shareToken: string;
	password?: string;
	settings: ShareSettings;
	onClick: () => void;
}

/**
 * Grid item for a file
 */
function FileGridItem({ file, shareToken, password, onClick }: FileItemProps): React.ReactNode {
	const previewType = getPreviewType(file);
	const showThumbnail = previewType === "image" || previewType === "video";

	return (
		<button
			onClick={onClick}
			className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:bg-secondary/50"
		>
			{/* Thumbnail */}
			<div className="relative aspect-square w-full bg-secondary">
				{showThumbnail ? (
					<img
						src={api.getShareThumbnailUrl(shareToken, file.id, "medium", password)}
						alt={file.name}
						className="h-full w-full object-cover"
						loading="lazy"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<FileIcon className="h-12 w-12 text-muted-foreground" />
					</div>
				)}
			</div>

			{/* File name */}
			<div className="p-2">
				<p className="truncate text-sm font-medium">{file.name}</p>
				<p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
			</div>
		</button>
	);
}

/**
 * List item for a file
 */
function FileListItem({
	file,
	shareToken,
	password,
	settings,
	onClick,
}: FileItemProps): React.ReactNode {
	function handleDownload(e: React.MouseEvent): void {
		e.stopPropagation();
		const url = api.getShareDownloadUrl(shareToken, password);
		const link = document.createElement("a");
		link.href = url;
		link.download = file.name;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	return (
		<button
			onClick={onClick}
			className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/50"
		>
			<FileIcon className="h-5 w-5 text-muted-foreground" />
			<div className="flex flex-1 flex-col text-left">
				<span className="font-medium">{file.name}</span>
				<span className="flex items-center gap-2 text-xs text-muted-foreground">
					<HardDrive className="h-3 w-3" />
					{formatFileSize(file.size)}
				</span>
			</div>
			{settings.allowDownload && (
				<Button variant="ghost" size="icon" onClick={handleDownload}>
					<Download className="h-4 w-4" />
				</Button>
			)}
		</button>
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
