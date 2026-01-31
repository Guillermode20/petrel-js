import { Music, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/components/viewers/video-player/utils";
import type { PlaylistProps } from "./types";

/**
 * Playlist component for displaying and managing audio tracks
 */
export function Playlist({
	files,
	currentIndex,
	isPlaying,
	onTrackSelect,
	className,
}: PlaylistProps) {
	return (
		<div className={cn("flex flex-col rounded-lg border border-border bg-card", className)}>
			<div className="flex items-center justify-between border-b border-border p-4">
				<h3 className="font-medium">Queue</h3>
				<span className="text-sm text-muted-foreground">{files.length} tracks</span>
			</div>

			<ScrollArea className="flex-1">
				<div className="flex flex-col">
					{files.map((file, index) => {
						const isCurrent = index === currentIndex;
						const audioMeta = file.metadata as
							| {
									title?: string;
									artist?: string;
									duration?: number;
									albumArt?: boolean;
							  }
							| undefined;
						const hasAlbumArt = audioMeta?.albumArt;

						return (
							<button
								key={file.id}
								onClick={() => onTrackSelect(index)}
								className={cn(
									"flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
									isCurrent && "bg-secondary",
								)}
							>
								{/* Track number / playing indicator */}
								<div className="flex h-8 w-8 shrink-0 items-center justify-center">
									{isCurrent && isPlaying ? (
										<div className="flex items-center gap-0.5">
											<span className="h-3 w-0.5 animate-pulse bg-primary" />
											<span className="h-4 w-0.5 animate-pulse bg-primary animation-delay-150" />
											<span className="h-2 w-0.5 animate-pulse bg-primary animation-delay-300" />
										</div>
									) : (
										<span className="text-sm text-muted-foreground">{index + 1}</span>
									)}
								</div>

								{/* Thumbnail */}
								<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary">
									{hasAlbumArt ? (
										<img
											src={api.getThumbnailUrl(file.id, "small")}
											alt=""
											className="h-full w-full object-cover"
										/>
									) : (
										<Music className="h-4 w-4 text-muted-foreground" />
									)}
								</div>

								{/* Track info */}
								<div className="min-w-0 flex-1">
									<p className={cn("truncate text-sm", isCurrent && "text-primary font-medium")}>
										{audioMeta?.title ?? file.name}
									</p>
									{audioMeta?.artist && (
										<p className="truncate text-xs text-muted-foreground">{audioMeta.artist}</p>
									)}
								</div>

								{/* Duration */}
								{audioMeta?.duration && (
									<span className="shrink-0 text-xs text-muted-foreground">
										{formatDuration(audioMeta.duration)}
									</span>
								)}

								{/* Play/pause button on hover */}
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
									onClick={(e) => {
										e.stopPropagation();
										onTrackSelect(index);
									}}
								>
									{isCurrent && isPlaying ? (
										<Pause className="h-4 w-4" />
									) : (
										<Play className="h-4 w-4" />
									)}
								</Button>
							</button>
						);
					})}
				</div>
			</ScrollArea>
		</div>
	);
}
