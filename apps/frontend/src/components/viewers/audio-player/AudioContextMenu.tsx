import { Download, Info } from "lucide-react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface AudioContextMenuProps {
	children: React.ReactNode;
	hasMetadata: boolean;
	onDownload?: () => void;
	onViewMetadata?: () => void;
}

/**
 * Context menu for audio player with download and metadata actions
 */
export function AudioContextMenu({
	children,
	hasMetadata,
	onDownload,
	onViewMetadata,
}: AudioContextMenuProps): React.ReactNode {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-48">
				{onDownload && (
					<ContextMenuItem onClick={onDownload}>
						<Download className="mr-2 h-4 w-4" />
						Download track
					</ContextMenuItem>
				)}
				{hasMetadata && onViewMetadata && (
					<>
						<ContextMenuSeparator />
						<ContextMenuItem onClick={onViewMetadata}>
							<Info className="mr-2 h-4 w-4" />
							View track info
						</ContextMenuItem>
					</>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
