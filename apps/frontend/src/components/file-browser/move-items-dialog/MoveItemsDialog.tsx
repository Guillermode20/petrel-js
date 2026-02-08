import type { Folder } from "@petrel/shared";
import { useQuery } from "@tanstack/react-query";
import { Folder as FolderIcon, Loader2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fileKeys } from "@/hooks/useFiles";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { isFolder } from "../utils/selection";
import type { MoveItemsDialogProps } from "./types";

const ROOT_LABEL = "Root";

function describeTarget(folderId: number | null, currentFolder?: Folder | null): string {
	if (folderId === null) return ROOT_LABEL;
	return currentFolder?.name ?? ROOT_LABEL;
}

function useMoveItemsDialogState(
	open: boolean,
	initialFolderId?: number | null,
	excludeFolderIds?: Set<number>,
) {
	const [folderId, setFolderId] = useState<number | null>(initialFolderId ?? null);

	useEffect(() => {
		if (open) {
			setFolderId(initialFolderId ?? null);
		}
	}, [open, initialFolderId]);

	const query = useQuery({
		queryKey: fileKeys.list({ folderId: folderId ?? undefined }),
		queryFn: () =>
			api.getFiles({
				folderId: folderId ?? undefined,
				page: 1,
				limit: 200,
			}),
		enabled: open,
	});

	const folders = useMemo(() => {
		const all = (query.data?.items ?? []).filter(isFolder);
		if (!excludeFolderIds || excludeFolderIds.size === 0) return all;
		return all.filter((f) => !excludeFolderIds.has(f.id));
	}, [query.data?.items, excludeFolderIds]);
	const parentChain = query.data?.parentChain ?? [];
	const targetLabel = describeTarget(folderId, query.data?.currentFolder);

	return { folderId, setFolderId, folders, parentChain, targetLabel, ...query };
}

function FolderBreadcrumbs({
	chain,
	onNavigate,
}: {
	chain: Folder[];
	onNavigate: (folderId: number | null) => void;
}) {
	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<button
							type="button"
							className="hover:text-foreground transition-colors"
							onClick={() => onNavigate(null)}
						>
							{ROOT_LABEL}
						</button>
					</BreadcrumbLink>
				</BreadcrumbItem>
				{chain.map((folder, index) => {
					const isLast = index === chain.length - 1;
					return (
						<Fragment key={folder.id}>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								{isLast ? (
									<BreadcrumbPage>{folder.name}</BreadcrumbPage>
								) : (
									<BreadcrumbLink asChild>
										<button
											type="button"
											className="hover:text-foreground transition-colors"
											onClick={() => onNavigate(folder.id)}
										>
											{folder.name}
										</button>
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
						</Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}

function FolderList({
	folders,
	onNavigate,
}: {
	folders: Folder[];
	onNavigate: (folderId: number) => void;
}) {
	if (folders.length === 0) {
		return <p className="text-sm text-muted-foreground">No subfolders found.</p>;
	}

	return (
		<div className="space-y-1">
			{folders.map((folder) => (
				<button
					key={folder.id}
					type="button"
					onClick={() => onNavigate(folder.id)}
					className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-muted"
				>
					<FolderIcon className="h-4 w-4 text-muted-foreground" />
					<span className="truncate">{folder.name}</span>
				</button>
			))}
		</div>
	);
}

export function MoveItemsDialog({
	open,
	onOpenChange,
	itemCount,
	initialFolderId,
	excludeFolderIds,
	onMove,
}: MoveItemsDialogProps) {
	const [isMoving, setIsMoving] = useState(false);
	const {
		folderId,
		setFolderId,
		folders,
		parentChain,
		targetLabel,
		isLoading,
		isError,
		refetch,
	} = useMoveItemsDialogState(open, initialFolderId, excludeFolderIds);

	const handleMove = async () => {
		setIsMoving(true);
		try {
			await onMove(folderId);
			onOpenChange(false);
		} finally {
			setIsMoving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Move {itemCount} item{itemCount === 1 ? "" : "s"}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<FolderBreadcrumbs chain={parentChain} onNavigate={setFolderId} />
					<div className={cn("rounded-md border border-border p-3", isLoading && "opacity-70")}>
						{isLoading && (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>Loading folders...</span>
							</div>
						)}
						{!isLoading && isError && (
							<div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
								<span>Failed to load folders.</span>
								<Button variant="outline" size="sm" onClick={() => refetch()}>
									Retry
								</Button>
							</div>
						)}
						{!isLoading && !isError && (
							<FolderList folders={folders} onNavigate={setFolderId} />
						)}
					</div>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isMoving}>
						Cancel
					</Button>
					<Button onClick={handleMove} disabled={isMoving || isLoading}>
						{isMoving ? "Moving..." : `Move to ${targetLabel}`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
