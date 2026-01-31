import { Download, X, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SelectionToolbarProps {
	selectedCount: number;
	totalCount: number;
	selectedSize?: number;
	onClearSelection: () => void;
	onSelectAll: () => void;
	onDownload?: () => void;
	onDownloadZip?: () => void;
	allowDownload?: boolean;
	allowZip?: boolean;
	className?: string;
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

/**
 * SelectionToolbar - Sticky bar for bulk actions
 *
 * Shows when items are selected, providing:
 * - Selection count and total size
 * - Select all / clear selection
 * - Bulk download (individual files)
 * - ZIP download (if enabled)
 */
export function SelectionToolbar({
	selectedCount,
	totalCount,
	selectedSize,
	onClearSelection,
	onSelectAll,
	onDownload,
	onDownloadZip,
	allowDownload = true,
	allowZip = true,
	className,
}: SelectionToolbarProps): React.ReactNode {
	if (selectedCount === 0) return null;

	const allSelected = selectedCount === totalCount;

	return (
		<div
			className={cn(
				"sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-card/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/75",
				className,
			)}
		>
			{/* Left: Selection info */}
			<div className="flex items-center gap-3">
				<span className="text-sm font-medium">
					{selectedCount} selected
					{selectedSize !== undefined && selectedSize > 0 && (
						<span className="ml-1 text-muted-foreground">({formatBytes(selectedSize)})</span>
					)}
				</span>

				<Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClearSelection}>
					<X className="mr-1 h-3 w-3" />
					Clear
				</Button>

				{!allSelected && (
					<Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onSelectAll}>
						Select all
					</Button>
				)}
			</div>

			{/* Right: Actions */}
			<div className="flex items-center gap-2">
				{allowZip && selectedCount > 1 && onDownloadZip && (
					<Button variant="secondary" size="sm" className="h-8 gap-1.5" onClick={onDownloadZip}>
						<FileArchive className="h-4 w-4" />
						<span className="hidden sm:inline">Download ZIP</span>
						<span className="sm:hidden">ZIP</span>
					</Button>
				)}

				{allowDownload && onDownload && (
					<Button variant="default" size="sm" className="h-8 gap-1.5" onClick={onDownload}>
						<Download className="h-4 w-4" />
						<span className="hidden sm:inline">
							{selectedCount === 1 ? "Download" : `Download (${selectedCount})`}
						</span>
						<span className="sm:hidden">Download</span>
					</Button>
				)}
			</div>
		</div>
	);
}
