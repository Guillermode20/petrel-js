import { CreateFolderDialog } from "./FileDialogs";
import { SearchBar } from "./SearchBar";
import { SortDropdown } from "./SortDropdown";
import type { SortField, ViewMode } from "./types";
import { ViewToggle } from "./ViewToggle";

interface FileBrowserToolbarProps {
	searchQuery: string;
	onSearchChange: (value: string) => void;
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
	sortBy: SortField;
	sortOrder: "asc" | "desc";
	onSortChange: (sortBy: SortField, sortOrder: "asc" | "desc") => void;
	onCreateFolder: (name: string) => Promise<void>;
	isCreatingFolder: boolean;
	createFolderOpen: boolean;
	onCreateFolderOpenChange: (open: boolean) => void;
}

/**
 * Toolbar for file browser with search, create folder, sort, and view toggle
 */
export function FileBrowserToolbar({
	searchQuery,
	onSearchChange,
	viewMode,
	onViewModeChange,
	sortBy,
	sortOrder,
	onSortChange,
	onCreateFolder,
	isCreatingFolder,
	createFolderOpen,
	onCreateFolderOpenChange,
}: FileBrowserToolbarProps): React.ReactNode {
	return (
		<div className="flex flex-wrap items-center justify-between gap-4">
			<div className="flex items-center gap-2">
				<SearchBar value={searchQuery} onChange={onSearchChange} className="w-48 sm:w-64" />
			</div>
			<div className="flex items-center gap-2">
				<CreateFolderDialog
					onCreateFolder={onCreateFolder}
					isCreating={isCreatingFolder}
					open={createFolderOpen}
					onOpenChange={onCreateFolderOpenChange}
				/>
				<SortDropdown sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
				<ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
			</div>
		</div>
	);
}
