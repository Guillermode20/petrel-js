import type { File, Folder } from "@petrel/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SortField, ViewMode } from "../types";
import { getSelectionKey, isFile, isFolder } from "../utils/selection";

interface UseFileBrowserStateOptions {
	folderId?: number;
	items: Array<File | Folder>;
	onClearClipboard?: () => void;
}

interface UseFileBrowserStateReturn {
	viewMode: ViewMode;
	sortBy: SortField;
	sortOrder: "asc" | "desc";
	searchQuery: string;
	selectedIds: Set<string>;
	page: number;
	limit: number;
	setViewMode: (mode: ViewMode) => void;
	setSortBy: (field: SortField) => void;
	setSortOrder: (order: "asc" | "desc") => void;
	setSearchQuery: (query: string) => void;
	setPage: (page: number) => void;
	toggleSelection: (item: File | Folder, event: React.MouseEvent) => void;
	clearSelection: () => void;
	selectRange: (start: File | Folder, end: File | Folder) => void;
	getSelectedItems: () => Array<File | Folder>;
	handleSort: (field: SortField) => void;
}

/**
 * Manages all UI state for the file browser including view mode, sorting,
 * search, pagination, and selection state.
 */
export function useFileBrowserState(
	options: UseFileBrowserStateOptions,
): UseFileBrowserStateReturn {
	const { folderId, items, onClearClipboard } = options;

	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [sortBy, setSortBy] = useState<SortField>("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [page, setPage] = useState(1);
	const limit = 40;

	const categorizedItems = useMemo(() => {
		const folders = items.filter(isFolder);
		const files = items.filter(isFile);
		return [...folders, ...files];
	}, [items]);

	const clearClipboardRef = useRef(onClearClipboard);

	useEffect(() => {
		clearClipboardRef.current = onClearClipboard;
	}, [onClearClipboard]);

	useEffect(() => {
		setSelectedIds(new Set());
		setPage(1);
		clearClipboardRef.current?.();
	}, [folderId]);

	const toggleSelection = useCallback((item: File | Folder, event: React.MouseEvent) => {
		const key = getSelectionKey(item);
		if (event.shiftKey || event.ctrlKey || event.metaKey) {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (next.has(key)) {
					next.delete(key);
				} else {
					next.add(key);
				}
				return next;
			});
		} else {
			setSelectedIds(new Set([key]));
		}
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedIds(new Set());
	}, []);

	const selectRange = useCallback(
		(start: File | Folder, end: File | Folder) => {
			const startKey = getSelectionKey(start);
			const endKey = getSelectionKey(end);
			const startIndex = categorizedItems.findIndex((i) => getSelectionKey(i) === startKey);
			const endIndex = categorizedItems.findIndex((i) => getSelectionKey(i) === endKey);

			if (startIndex === -1 || endIndex === -1) return;

			const [min, max] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
			const rangeKeys = categorizedItems.slice(min, max + 1).map(getSelectionKey);

			setSelectedIds((prev) => {
				const next = new Set(prev);
				for (const key of rangeKeys) {
					next.add(key);
				}
				return next;
			});
		},
		[categorizedItems],
	);

	const getSelectedItems = useCallback(
		(): Array<File | Folder> =>
			categorizedItems.filter((item) => selectedIds.has(getSelectionKey(item))),
		[categorizedItems, selectedIds],
	);

	const handleSort = useCallback(
		(field: SortField) => {
			if (sortBy === field) {
				setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
			} else {
				setSortBy(field);
				setSortOrder("asc");
			}
		},
		[sortBy],
	);

	return {
		viewMode,
		sortBy,
		sortOrder,
		searchQuery,
		selectedIds,
		page,
		limit,
		setViewMode,
		setSortBy,
		setSortOrder,
		setSearchQuery,
		setPage,
		toggleSelection,
		clearSelection,
		selectRange,
		getSelectedItems,
		handleSort,
	};
}
