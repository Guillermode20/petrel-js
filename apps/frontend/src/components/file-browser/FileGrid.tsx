import type { File, Folder } from "@petrel/shared";
import { isFile, isFolder } from "@/hooks";
import { FileCard } from "./FileCard";
import { FileContextMenu } from "./FileContextMenu";
import type { FileGridProps } from "./types";

/**
 * Grid view for files and folders
 */
export function FileGrid({
	items,
	selectedIds,
	onSelect,
	onOpen,
	onMove,
	onRename,
	onDelete,
	onShare,
	onDownload,
	onCopyLink,
	isLoading,
}: FileGridProps) {
	const handleDragStart = (item: File | Folder, e: React.DragEvent) => {
		const dt = e.dataTransfer as any;
		dt?.setData(
			"text/plain",
			JSON.stringify({ id: item.id, type: isFile(item) ? "file" : "folder" }),
		);
		dt && (dt.effectAllowed = "move");
	};

	const handleDrop = (target: File | Folder, e: React.DragEvent) => {
		if (!isFolder(target)) return;
		e.preventDefault?.();
		try {
			const dt = e.dataTransfer as any;
			const data = JSON.parse(dt?.getData("text/plain") || "{}");
			if (data.id === target.id && data.type === "folder") return;
			onMove(data, target.id);
		} catch (_err) {}
	};

	if (!isLoading && items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<p className="text-lg font-medium text-muted-foreground">No files yet</p>
				<p className="text-sm text-muted-foreground">
					Upload files or create a folder to get started
				</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-y-4 gap-x-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{items.map((item) => {
				const selectionKey = `${isFolder(item) ? "folder" : "file"}-${item.id}`;

				return (
					<FileContextMenu
						key={selectionKey}
						item={item}
						onOpen={() => onOpen(item)}
						onRename={() => onRename?.(item)}
						onDelete={() => onDelete?.(item)}
						onShare={() => onShare?.(item)}
						onDownload={() => onDownload?.(item)}
						onMove={() => {}} // Custom move menu could be added later
						onCopyLink={() => onCopyLink?.(item)}
					>
						<FileCard
							item={item}
							isSelected={selectedIds.has(selectionKey)}
							onSelect={onSelect}
							onDoubleClick={(item: File | Folder) => onOpen(item)}
							onDragStart={handleDragStart}
							onDrop={handleDrop}
						/>
					</FileContextMenu>
				);
			})}
		</div>
	);
}
