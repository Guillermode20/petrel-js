import type { File, ShareSettings } from "@petrel/shared";
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface PhotoGalleryProps {
	files: File[];
	shareToken: string;
	password?: string;
	settings: ShareSettings;
	className?: string;
}

/**
 * PhotoGallery - Image gallery for shared folders
 *
 * Features:
 * - Thumbnail grid
 * - Lightbox on click
 * - Keyboard navigation
 * - Zoom controls
 */
export function PhotoGallery({
	files,
	shareToken,
	password,
	settings,
	className,
}: PhotoGalleryProps): React.ReactNode {
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

	const openLightbox = useCallback((index: number) => {
		setLightboxIndex(index);
	}, []);

	const closeLightbox = useCallback(() => {
		setLightboxIndex(null);
	}, []);

	const navigateLightbox = useCallback(
		(direction: "prev" | "next") => {
			if (lightboxIndex === null) return;
			const newIndex =
				direction === "prev"
					? Math.max(0, lightboxIndex - 1)
					: Math.min(files.length - 1, lightboxIndex + 1);
			setLightboxIndex(newIndex);
		},
		[lightboxIndex, files.length],
	);

	return (
		<div className={cn("flex flex-1 flex-col", className)}>
			{/* Grid */}
			<div className="flex-1 overflow-auto p-4">
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
					{files.map((file, index) => (
						<ThumbnailItem
							key={file.id}
							file={file}
							shareToken={shareToken}
							password={password}
							onClick={() => openLightbox(index)}
						/>
					))}
				</div>
			</div>

			{/* Lightbox */}
			{lightboxIndex !== null && (
				<Lightbox
					files={files}
					currentIndex={lightboxIndex}
					shareToken={shareToken}
					password={password}
					settings={settings}
					onClose={closeLightbox}
					onNavigate={navigateLightbox}
				/>
			)}
		</div>
	);
}

interface ThumbnailItemProps {
	file: File;
	shareToken: string;
	password?: string;
	onClick: () => void;
}

/**
 * Thumbnail item in the grid
 */
function ThumbnailItem({
	file,
	shareToken,
	password,
	onClick,
}: ThumbnailItemProps): React.ReactNode {
	return (
		<button
			onClick={onClick}
			className="group relative aspect-square overflow-hidden rounded-lg bg-secondary transition-transform hover:scale-[1.02]"
		>
			<img
				src={api.getShareThumbnailUrl(shareToken, file.id, "medium", password)}
				alt={file.name}
				className="h-full w-full object-cover"
				loading="lazy"
			/>
			<div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
		</button>
	);
}

interface LightboxProps {
	files: File[];
	currentIndex: number;
	shareToken: string;
	password?: string;
	settings: ShareSettings;
	onClose: () => void;
	onNavigate: (direction: "prev" | "next") => void;
}

/**
 * Full-screen lightbox for viewing images
 */
function Lightbox({
	files,
	currentIndex,
	shareToken,
	password,
	settings,
	onClose,
	onNavigate,
}: LightboxProps): React.ReactNode {
	const [zoom, setZoom] = useState(1);
	const currentFile = files[currentIndex];
	const hasPrev = currentIndex > 0;
	const hasNext = currentIndex < files.length - 1;

	// Keyboard navigation
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent): void {
			switch (e.key) {
				case "Escape":
					onClose();
					break;
				case "ArrowLeft":
					if (hasPrev) onNavigate("prev");
					break;
				case "ArrowRight":
					if (hasNext) onNavigate("next");
					break;
				case "+":
				case "=":
					setZoom((z) => Math.min(3, z + 0.25));
					break;
				case "-":
					setZoom((z) => Math.max(0.5, z - 0.25));
					break;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose, onNavigate, hasPrev, hasNext]);

	// Reset zoom when image changes
	useEffect(() => {
		setZoom(1);
	}, [currentIndex]);

	// Early return if no current file (after hooks)
	if (!currentFile) {
		return null;
	}

	function handleDownload(): void {
		if (!currentFile) return;
		const url = api.getShareDownloadUrl(shareToken, password);
		const link = document.createElement("a");
		link.href = url;
		link.download = currentFile.name;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-black/95">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2">
				<span className="text-sm text-white/80">
					{currentIndex + 1} / {files.length}
				</span>

				<div className="flex items-center gap-2">
					<span className="text-sm text-white/80">{currentFile.name}</span>
				</div>

				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
						className="text-white hover:bg-white/10"
					>
						<ZoomOut className="h-4 w-4" />
					</Button>
					<span className="min-w-[3rem] text-center text-sm text-white/80">
						{Math.round(zoom * 100)}%
					</span>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
						className="text-white hover:bg-white/10"
					>
						<ZoomIn className="h-4 w-4" />
					</Button>

					{settings.allowDownload && (
						<Button
							variant="ghost"
							size="icon"
							onClick={handleDownload}
							className="text-white hover:bg-white/10"
						>
							<Download className="h-4 w-4" />
						</Button>
					)}

					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						className="text-white hover:bg-white/10"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Image */}
			<div className="relative flex flex-1 items-center justify-center overflow-hidden">
				<img
					src={api.getShareThumbnailUrl(shareToken, currentFile.id, "large", password)}
					alt={currentFile.name}
					className="max-h-full max-w-full object-contain transition-transform"
					style={{ transform: `scale(${zoom})` }}
				/>

				{/* Navigation arrows */}
				{hasPrev && (
					<Button
						variant="ghost"
						size="icon"
						className="absolute left-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
						onClick={() => onNavigate("prev")}
					>
						<ChevronLeft className="h-6 w-6" />
					</Button>
				)}

				{hasNext && (
					<Button
						variant="ghost"
						size="icon"
						className="absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
						onClick={() => onNavigate("next")}
					>
						<ChevronRight className="h-6 w-6" />
					</Button>
				)}
			</div>
		</div>
	);
}
