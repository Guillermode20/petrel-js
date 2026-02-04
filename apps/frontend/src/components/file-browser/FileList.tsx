import type { File, Folder } from "@petrel/shared";
import { format } from "date-fns";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import type { MenuContext } from "@/components/global-context-menu";
import { useLongPress } from "@/components/global-context-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { FileListProps, SortField } from "./types";
import {
	formatFileSize,
	getFileCategory,
	getFileIcon,
	getFolderIcon,
	getRelativePath,
} from "./utils";
import { getSelectionKey, isFile, isFolder } from "./utils/selection";

/**
 * List view for files and folders
 */
export function FileList({
	items,
	selectedIds,
	onSelect,
	onOpen,
	onMove,
	onContextMenu,
	sortBy,
	sortOrder,
	onSort,
	isLoading,
	contextMenuHandlerId,
	buildContextMenuContext,
	currentFolderPath,
	searchQuery,
}: FileListProps) {
	const [dragOverId, setDragOverId] = useState<number | null>(null);
	const SortIcon = sortOrder === "asc" ? ArrowUp : ArrowDown;

	const handleDragStart = (item: File | Folder, e: React.DragEvent) => {
		e.dataTransfer.setData(
			"text/plain",
			JSON.stringify({ id: item.id, type: isFile(item) ? "file" : "folder" }),
		);
		e.dataTransfer.effectAllowed = "move";
	};

	const handleDragOver = (item: File | Folder, e: React.DragEvent) => {
		if (!isFolder(item)) return;
		e.preventDefault();
		setDragOverId(item.id);
	};

	const handleDrop = (target: File | Folder, e: React.DragEvent) => {
		if (!isFolder(target)) return;
		e.preventDefault();
		setDragOverId(null);
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

	const renderSortableHeader = (field: SortField, label: string) => (
		<button className="flex items-center gap-1 hover:text-foreground" onClick={() => onSort(field)}>
			{label}
			{sortBy === field && <SortIcon className="h-3 w-3" />}
		</button>
	);

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
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[50%]">{renderSortableHeader("name", "Name")}</TableHead>
					<TableHead className="hidden md:table-cell">
						{renderSortableHeader("type", "Type")}
					</TableHead>
					<TableHead className="hidden sm:table-cell">
						{renderSortableHeader("size", "Size")}
					</TableHead>
					<TableHead className="hidden lg:table-cell">
						{renderSortableHeader("date", "Modified")}
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((item) => {
					const isFileItem = isFile(item);
					const Icon = isFileItem ? getFileIcon(item.mimeType) : getFolderIcon();
					const selectionKey = getSelectionKey(item);
					const isSelected = selectedIds.has(selectionKey);
					const relativeFolderPath =
						searchQuery && isFileItem ? getRelativePath(item.path, currentFolderPath) : "";

					return (
						<FileListRow
							key={selectionKey}
							item={item}
							items={items}
							selectedIds={selectedIds}
							isSelected={isSelected}
							isDragOver={dragOverId === item.id}
							onSelect={onSelect}
							onOpen={onOpen}
							onContextMenu={onContextMenu}
							onDragStart={handleDragStart}
							onDragOver={handleDragOver}
							onDragLeave={() => setDragOverId(null)}
							onDrop={handleDrop}
							contextMenuHandlerId={contextMenuHandlerId}
							buildContextMenuContext={buildContextMenuContext}
						>
							<TableCell>
								<div className="flex flex-col gap-0.5">
									<div className="flex items-center gap-3">
										<div className="flex h-8 w-8 items-center justify-center rounded bg-muted/50 group-hover:bg-primary/20 transition-colors">
											<Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
										</div>
										<span className="font-medium">{item.name}</span>
									</div>
									{relativeFolderPath && (
										<span
											className="text-xs text-muted-foreground ml-11 truncate"
											title={relativeFolderPath}
										>
											{relativeFolderPath}
										</span>
									)}
								</div>
							</TableCell>
							<TableCell className="hidden text-muted-foreground md:table-cell">
								{isFileItem ? getFileCategory(item.mimeType) : "Folder"}
							</TableCell>
							<TableCell className="hidden text-muted-foreground sm:table-cell">
								{isFileItem ? formatFileSize(item.size) : "—"}
							</TableCell>
							<TableCell className="hidden text-muted-foreground lg:table-cell">
								{isFileItem ? format(new Date(item.createdAt), "MMM d, yyyy") : "—"}
							</TableCell>
						</FileListRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

interface FileListRowProps {
	children: React.ReactNode;
	item: File | Folder;
	items: Array<File | Folder>;
	selectedIds: Set<string>;
	isSelected: boolean;
	isDragOver: boolean;
	onSelect: (item: File | Folder, event: React.MouseEvent) => void;
	onOpen: (item: File | Folder) => void;
	onContextMenu: (item: File | Folder, event: React.MouseEvent) => void;
	onDragStart: (item: File | Folder, e: React.DragEvent) => void;
	onDragOver: (item: File | Folder, e: React.DragEvent) => void;
	onDragLeave: () => void;
	onDrop: (target: File | Folder, e: React.DragEvent) => void;
	contextMenuHandlerId?: string;
	buildContextMenuContext?: (
		item: File | Folder,
		items: Array<File | Folder>,
		selectedIds: Set<string>,
	) => MenuContext;
}

function buildMenuContext(
	item: File | Folder,
	items: Array<File | Folder>,
	selectedIds: Set<string>,
	buildContextMenuContext?: (
		item: File | Folder,
		items: Array<File | Folder>,
		selectedIds: Set<string>,
	) => MenuContext,
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

function FileListRow({
	children,
	item,
	items,
	selectedIds,
	isSelected,
	isDragOver,
	onSelect,
	onOpen,
	onContextMenu,
	onDragStart,
	onDragOver,
	onDragLeave,
	onDrop,
	contextMenuHandlerId,
	buildContextMenuContext,
}: FileListRowProps) {
	const { onContextMenu: _onContextMenu, ...longPressHandlers } = useLongPress(
		buildMenuContext(item, items, selectedIds, buildContextMenuContext),
		contextMenuHandlerId,
	);

	return (
		<TableRow
			className={cn(
				"cursor-pointer group",
				isSelected && "bg-primary/10",
				isDragOver && "bg-primary/20 ring-2 ring-primary ring-inset",
			)}
			onClick={(e) => onSelect(item, e)}
			onDoubleClick={() => onOpen(item)}
			onContextMenuCapture={(e) => onSelect(item, e)}
			onContextMenu={(e) => onContextMenu(item, e)}
			draggable
			onDragStart={(e) => onDragStart(item, e)}
			onDragOver={(e) => onDragOver(item, e)}
			onDragLeave={onDragLeave}
			onDrop={(e) => onDrop(item, e)}
			{...longPressHandlers}
		>
			{children}
		</TableRow>
	);
}
