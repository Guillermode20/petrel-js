import { Pagination } from "@/components/ui/pagination";

interface FileBrowserStatusBarProps {
	selectionCount: number;
	selectionSize: number;
	totalItems: number;
	currentItemsCount: number;
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

/**
 * Status bar showing selection stats or item count with pagination
 */
export function FileBrowserStatusBar({
	selectionCount,
	selectionSize,
	totalItems,
	currentItemsCount,
	currentPage,
	totalPages,
	onPageChange,
}: FileBrowserStatusBarProps): React.ReactNode {
	const hasSelection = selectionCount > 0;

	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex items-center gap-4">
				{hasSelection ? (
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-primary">{selectionCount} selected</span>
						{selectionSize > 0 && (
							<span className="text-xs text-muted-foreground">
								({(selectionSize / 1024 / 1024).toFixed(1)} MB)
							</span>
						)}
					</div>
				) : (
					<div className="text-xs text-muted-foreground">
						Showing {currentItemsCount} of {totalItems} items
					</div>
				)}
			</div>

			{totalPages > 1 && (
				<Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
			)}
		</div>
	);
}
