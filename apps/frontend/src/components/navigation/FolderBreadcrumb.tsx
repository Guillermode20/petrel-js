import type { Folder } from "@petrel/shared";
import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { Fragment, useState } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

interface BreadcrumbSegment {
	label: string;
	href?: string;
	id?: number;
}

interface FolderBreadcrumbProps {
	segments: BreadcrumbSegment[];
	className?: string;
	onMove?: (item: { id: number; type: "file" | "folder" }, targetFolderId: number | null) => void;
}

/**
 * Breadcrumb navigation for folder hierarchy
 */
export function FolderBreadcrumb({ segments, className, onMove }: FolderBreadcrumbProps) {
	const [dragOverId, setDragOverId] = useState<number | "root" | null>(null);

	const handleDragOver = (e: React.DragEvent, id: number | "root") => {
		e.preventDefault();
		setDragOverId(id);
	};

	const handleDrop = (e: React.DragEvent, id: number | "root") => {
		e.preventDefault();
		setDragOverId(null);
		try {
			const data = JSON.parse(e.dataTransfer.getData("text/plain"));
			const targetId = id === "root" ? null : id;
			if (data.id === targetId && data.type === "folder") return;
			onMove?.(data, targetId);
		} catch (_err) {}
	};

	return (
		<Breadcrumb className={className}>
			<BreadcrumbList>
				<BreadcrumbItem
					key="root"
					onDragOver={(e) => handleDragOver(e, "root")}
					onDragLeave={() => setDragOverId(null)}
					onDrop={(e) => handleDrop(e, "root")}
					className={cn(
						"rounded px-1 transition-colors",
						dragOverId === "root" && "bg-primary/20 ring-2 ring-primary ring-inset",
					)}
				>
					<BreadcrumbLink asChild>
						<Link to="/files" className="flex items-center gap-1">
							<Home className="h-4 w-4" />
							<span>Files</span>
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				{segments.map((segment, index) => {
					const isLast = index === segments.length - 1;
					const segmentId =
						segment.id ??
						(segment.href?.split("/").pop() ? Number(segment.href.split("/").pop()) : undefined);
					const key = segment.href ? `segment-${segment.href}` : `segment-idx-${index}`;

					return (
						<Fragment key={key}>
							<BreadcrumbSeparator />
							<BreadcrumbItem
								onDragOver={(e) => segmentId !== undefined && handleDragOver(e, segmentId)}
								onDragLeave={() => setDragOverId(null)}
								onDrop={(e) => segmentId !== undefined && handleDrop(e, segmentId)}
								className={cn(
									"rounded px-1 transition-colors",
									segmentId !== undefined &&
										dragOverId === segmentId &&
										"bg-primary/20 ring-2 ring-primary ring-inset",
								)}
							>
								{isLast ? (
									<BreadcrumbPage>{segment.label}</BreadcrumbPage>
								) : segment.id ? (
									<BreadcrumbLink asChild>
										<Link to="/files/$folderId" params={{ folderId: String(segment.id) }}>
											{segment.label}
										</Link>
									</BreadcrumbLink>
								) : segment.href ? (
									<BreadcrumbLink asChild>
										<Link to={segment.href}>{segment.label}</Link>
									</BreadcrumbLink>
								) : (
									<BreadcrumbPage>{segment.label}</BreadcrumbPage>
								)}
							</BreadcrumbItem>
						</Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}

/**
 * Build breadcrumb segments from a folder path
 */
interface BuildBreadcrumbOptions {
	chain?: Folder[];
	path?: string;
	folderNames?: Map<string, string>;
}

export function buildBreadcrumbSegments({
	chain,
	path = "",
	folderNames,
}: BuildBreadcrumbOptions): BreadcrumbSegment[] {
	if (chain && chain.length > 0) {
		return chain.map((folder) => ({
			id: folder.id,
			label: folder.name,
		}));
	}

	if (!path || path === "/") {
		return [];
	}

	const parts = path.split("/").filter(Boolean);
	const segments: BreadcrumbSegment[] = [];
	let currentPath = "";

	for (const part of parts) {
		currentPath += `/${part}`;
		const label = folderNames?.get(currentPath) ?? part;
		segments.push({
			label,
			href: `/files${currentPath}`,
		});
	}

	return segments;
}
