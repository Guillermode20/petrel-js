import type { File, Folder } from "@petrel/shared";
import { getSelectionKey, isFile, isFolder } from "./utils/selection";
import { FileCard } from "./FileCard";
import { useLongPress } from "@/components/global-context-menu";
import type { MenuContext } from "@/components/global-context-menu";
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
	isLoading,
	onContextMenu,
	contextMenuHandlerId,
	buildContextMenuContext,
	currentFolderPath,
	searchQuery,
}: FileGridProps) {
	const handleDragStart = (item: File | Folder, e: React.DragEvent) => {
		const dt = e.dataTransfer;
		dt.setData("text/plain", JSON.stringify({ id: item.id, type: isFile(item) ? "file" : "folder" }));
		dt.effectAllowed = "move";
	};

	const handleDrop = (target: File | Folder, e: React.DragEvent) => {
		if (!isFolder(target)) return;
		e.preventDefault?.();
		try {
			const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}") as {
				id?: number;
				type?: "file" | "folder";
			};
			if (data.id === target.id && data.type === "folder") return;
			if (typeof data.id !== "number" || (data.type !== "file" && data.type !== "folder")) return;
			onMove({ id: data.id, type: data.type }, target.id);
		} catch {
			// ignore invalid drag payload
		}
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
		<div className="grid grid-cols-2 gap-y-2 gap-x-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{items.map((item) => {
				const selectionKey = getSelectionKey(item);

				return (
					<FileGridItem
						key={selectionKey}
						item={item}
						items={items}
						selectedIds={selectedIds}
						isSelected={selectedIds.has(selectionKey)}
						onSelect={onSelect}
						onOpen={onOpen}
						onContextMenu={onContextMenu}
						onDragStart={handleDragStart}
						onDrop={handleDrop}
						contextMenuHandlerId={contextMenuHandlerId}
						buildContextMenuContext={buildContextMenuContext}
						currentFolderPath={currentFolderPath}
						searchQuery={searchQuery}
					/>
				);
			})}
		</div>
	);
}

interface FileGridItemProps {
	item: File | Folder;
	items: Array<File | Folder>;
	selectedIds: Set<string>;
	isSelected: boolean;
	onSelect: (item: File | Folder, event: React.MouseEvent) => void;
	onOpen: (item: File | Folder) => void;
	onContextMenu: (item: File | Folder, event: React.MouseEvent) => void;
	onDragStart: (item: File | Folder, e: React.DragEvent) => void;
	onDrop: (target: File | Folder, e: React.DragEvent) => void;
	contextMenuHandlerId?: string;
	buildContextMenuContext?: (item: File | Folder, items: Array<File | Folder>, selectedIds: Set<string>) => MenuContext;
	currentFolderPath?: string | null;
	searchQuery?: string;
}

function buildMenuContext(
	item: File | Folder,
	items: Array<File | Folder>,
	selectedIds: Set<string>,
	buildContextMenuContext?: (item: File | Folder, items: Array<File | Folder>, selectedIds: Set<string>) => MenuContext,
): MenuContext {
	if (buildContextMenuContext) {
		return buildContextMenuContext(item, items, selectedIds);
	}
	if (selectedIds.size > 1) {
		const selectedItems = items.filter((i) => selectedIds.has(getSelectionKey(i)));
		return { type: "multi-selection", items: selectedItems, selectedIds };
	}

	if (isFolder(item)) {
		return { type: "folder", item };
	}
	return { type: "file", item };
}

function FileGridItem({
	item,
	items,
	selectedIds,
	isSelected,
	onSelect,
	onOpen,
	onContextMenu,
	onDragStart,
	onDrop,
	contextMenuHandlerId,
	buildContextMenuContext,
	currentFolderPath,
	searchQuery,
}: FileGridItemProps) {
	const { onContextMenu: _onContextMenu, ...longPressHandlers } = useLongPress(
		buildMenuContext(item, items, selectedIds, buildContextMenuContext),
		contextMenuHandlerId,
	);

	return (
		<FileCard
			item={item}
			isSelected={isSelected}
			onSelect={onSelect}
			onDoubleClick={(i: File | Folder) => onOpen(i)}
			onDragStart={onDragStart}
			onDrop={onDrop}
			onContextMenu={(e) => onContextMenu(item, e)}
			currentFolderPath={currentFolderPath}
			searchQuery={searchQuery}
			{...longPressHandlers}
		/>
	);
}
