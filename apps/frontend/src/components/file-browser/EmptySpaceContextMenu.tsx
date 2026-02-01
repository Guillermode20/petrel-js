import { FolderPlus, Grid, List, RefreshCw, Upload } from "lucide-react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { ViewMode } from "./types";

interface EmptySpaceContextMenuProps {
	children: React.ReactNode;
	viewMode: ViewMode;
	onUpload?: () => void;
	onNewFolder?: () => void;
	onRefresh?: () => void;
	onViewModeChange?: (mode: ViewMode) => void;
}

/**
 * Context menu for empty space in file browser (right-click on background)
 */
export function EmptySpaceContextMenu({
	children,
	viewMode,
	onUpload,
	onNewFolder,
	onRefresh,
	onViewModeChange,
}: EmptySpaceContextMenuProps): React.ReactNode {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-48">
				{onUpload && (
					<ContextMenuItem onClick={onUpload}>
						<Upload className="mr-2 h-4 w-4" />
						Upload files
					</ContextMenuItem>
				)}
				{onNewFolder && (
					<ContextMenuItem onClick={onNewFolder}>
						<FolderPlus className="mr-2 h-4 w-4" />
						New folder
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				{onRefresh && (
					<ContextMenuItem onClick={onRefresh}>
						<RefreshCw className="mr-2 h-4 w-4" />
						Refresh
					</ContextMenuItem>
				)}
				{onViewModeChange && (
					<>
						<ContextMenuSeparator />
						<ContextMenuSub>
							<ContextMenuSubTrigger>
								{viewMode === "grid" ? (
									<Grid className="mr-2 h-4 w-4" />
								) : (
									<List className="mr-2 h-4 w-4" />
								)}
								View
							</ContextMenuSubTrigger>
							<ContextMenuSubContent>
								<ContextMenuItem onClick={() => onViewModeChange("grid")}>
									<Grid className="mr-2 h-4 w-4" />
									Grid view
									{viewMode === "grid" && <span className="ml-auto">✓</span>}
								</ContextMenuItem>
								<ContextMenuItem onClick={() => onViewModeChange("list")}>
									<List className="mr-2 h-4 w-4" />
									List view
									{viewMode === "list" && <span className="ml-auto">✓</span>}
								</ContextMenuItem>
							</ContextMenuSubContent>
						</ContextMenuSub>
					</>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
