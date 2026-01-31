import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ViewMode } from "./types";

interface ViewToggleProps {
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
}

/**
 * Toggle between grid and list view
 */
export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
	return (
		<TooltipProvider>
			<div className="flex items-center rounded-lg border border-border">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant={viewMode === "grid" ? "secondary" : "ghost"}
							size="icon"
							className="h-8 w-8 rounded-r-none"
							onClick={() => onViewModeChange("grid")}
						>
							<LayoutGrid className="h-4 w-4" />
							<span className="sr-only">Grid view</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>Grid view</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant={viewMode === "list" ? "secondary" : "ghost"}
							size="icon"
							className="h-8 w-8 rounded-l-none"
							onClick={() => onViewModeChange("list")}
						>
							<List className="h-4 w-4" />
							<span className="sr-only">List view</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>List view</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
}
