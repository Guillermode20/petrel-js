import type { File, Folder, ShareSettings } from "@petrel/shared";
import { FolderOpen, Image, Music } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPreviewType } from "../viewers/file-preview/utils";
import { FolderBrowser } from "./FolderBrowser";
import { PhotoGallery } from "./PhotoGallery";
import { ShareAudioPlaylist } from "./ShareAudioPlaylist";

export interface ShareFolderViewProps {
	folder: Folder;
	files: File[];
	folders: Folder[];
	shareToken: string;
	password?: string;
	settings: ShareSettings;
	className?: string;
}

type FolderViewMode = "browser" | "gallery" | "playlist";

/**
 * ShareFolderView - Folder share view controller
 *
 * Smart defaults:
 * - All images -> PhotoGallery mode
 * - All audio -> AudioPlaylist mode
 * - Mixed -> FolderBrowser mode
 */
export function ShareFolderView({
	folder,
	files,
	folders,
	shareToken,
	password,
	settings,
	className,
}: ShareFolderViewProps): React.ReactNode {
	const detectedMode = useMemo(() => detectViewMode(files), [files]);
	const [viewMode, setViewMode] = useState<FolderViewMode>(detectedMode);

	// Determine available modes based on content
	const availableModes = useMemo(() => {
		const types = files.map((f) => getPreviewType(f));
		const hasImages = types.some((t) => t === "image");
		const hasAudio = types.some((t) => t === "audio");
		const modes: FolderViewMode[] = ["browser"];
		if (hasImages) modes.push("gallery");
		if (hasAudio) modes.push("playlist");
		return modes;
	}, [files]);

	// Only show toggle if multiple modes available
	const showToggle = availableModes.length > 1;

	return (
		<div className={cn("flex flex-1 flex-col", className)}>
			{/* View mode toggle */}
			{showToggle && (
				<div className="flex items-center gap-2 border-b border-border px-4 py-2">
					<span className="text-sm text-muted-foreground">View:</span>
					{availableModes.includes("browser") && (
						<Button
							variant={viewMode === "browser" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setViewMode("browser")}
							className="gap-1.5"
						>
							<FolderOpen className="h-4 w-4" />
							<span className="hidden sm:inline">Files</span>
						</Button>
					)}
					{availableModes.includes("gallery") && (
						<Button
							variant={viewMode === "gallery" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setViewMode("gallery")}
							className="gap-1.5"
						>
							<Image className="h-4 w-4" />
							<span className="hidden sm:inline">Gallery</span>
						</Button>
					)}
					{availableModes.includes("playlist") && (
						<Button
							variant={viewMode === "playlist" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setViewMode("playlist")}
							className="gap-1.5"
						>
							<Music className="h-4 w-4" />
							<span className="hidden sm:inline">Playlist</span>
						</Button>
					)}
				</div>
			)}

			{renderView(viewMode, {
				folder,
				files,
				folders,
				shareToken,
				password,
				settings,
			})}
		</div>
	);
}

interface ViewRenderProps {
	folder: Folder;
	files: File[];
	folders: Folder[];
	shareToken: string;
	password?: string;
	settings: ShareSettings;
}

/**
 * Renders the appropriate view based on mode
 */
function renderView(mode: FolderViewMode, props: ViewRenderProps): React.ReactNode {
	switch (mode) {
		case "gallery":
			return (
				<PhotoGallery
					files={props.files}
					shareToken={props.shareToken}
					password={props.password}
					settings={props.settings}
				/>
			);

		case "playlist":
			return (
				<ShareAudioPlaylist
					files={props.files}
					shareToken={props.shareToken}
					password={props.password}
					settings={props.settings}
				/>
			);

		default:
			return (
				<FolderBrowser
					folder={props.folder}
					files={props.files}
					folders={props.folders}
					shareToken={props.shareToken}
					password={props.password}
					settings={props.settings}
				/>
			);
	}
}

/**
 * Detects the best view mode based on file types
 */
function detectViewMode(files: File[]): FolderViewMode {
	if (files.length === 0) {
		return "browser";
	}

	const types = files.map((f) => getPreviewType(f));
	const imageCount = types.filter((t) => t === "image").length;
	const audioCount = types.filter((t) => t === "audio").length;

	// All images -> gallery
	if (imageCount === files.length) {
		return "gallery";
	}

	// All audio -> playlist
	if (audioCount === files.length) {
		return "playlist";
	}

	// Mixed -> browser
	return "browser";
}
