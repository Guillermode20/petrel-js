import type { File } from "@petrel/shared";
import { format } from "date-fns";
import { ExternalLink, Link, Lock, MoreHorizontal, Trash2 } from "lucide-react";
import { formatFileSize, getFileIcon, getFolderIcon } from "@/components/file-browser/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CopyLinkButton, getShareUrl } from "./CopyLinkButton";
import type { ShareTableProps, ShareWithContent } from "./types";

const DEFAULT_THUMBNAIL_SIZE = "small";

export function ShareTable({ shares, isLoading, onDelete, className }: ShareTableProps) {
	if (isLoading) {
		return null;
	}

	if (shares.length === 0) {
		return <EmptyState className={className} />;
	}

	return (
		<div className={cn("rounded-lg border border-border", className)}>
			<Table>
				<ShareTableHeader />
				<TableBody>
					{shares.map((share) => (
						<ShareRow key={share.id} share={share} onDelete={onDelete} />
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function EmptyState({ className }: { className?: string }) {
	return (
		<div className={cn("flex flex-col items-center justify-center py-12", className)}>
			<Link className="h-12 w-12 text-muted-foreground" />
			<p className="mt-4 text-lg font-medium">No shares yet</p>
			<p className="text-sm text-muted-foreground">Create share links from the file browser</p>
		</div>
	);
}

function ShareTableHeader() {
	return (
		<TableHeader>
			<TableRow>
				<TableHead className="w-[35%]">Name</TableHead>
				<TableHead className="hidden md:table-cell">Size</TableHead>
				<TableHead>Created</TableHead>
				<TableHead>Expires</TableHead>
				<TableHead className="hidden sm:table-cell">Views</TableHead>
				<TableHead>Status</TableHead>
				<TableHead className="w-[200px]">Actions</TableHead>
			</TableRow>
		</TableHeader>
	);
}

interface ShareRowProps {
	share: ShareWithContent;
	onDelete?: (shareId: number) => void;
}

function ShareRow({ share, onDelete }: ShareRowProps) {
	const expired = isExpired(share.expiresAt);
	const isFileShare = share.type === "file";
	const content = share.content;
	const fileContent = isFileShare ? (content as File) : null;
	const fileMime = fileContent?.mimeType;
	const isImage = Boolean(fileMime?.startsWith("image/"));
	const Icon = fileMime ? getFileIcon(fileMime) : getFolderIcon();
	const sizeLabel =
		fileContent && fileContent.size != null ? formatFileSize(fileContent.size) : "—";
	const thumbnailUrl = isImage ? api.getThumbnailUrl(content.id, DEFAULT_THUMBNAIL_SIZE) : null;

	return (
		<TableRow>
			<TableCell>
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-muted/50">
						{thumbnailUrl ? (
							<img
								src={thumbnailUrl}
								alt={content.name}
								className="h-full w-full object-cover"
								loading="lazy"
							/>
						) : (
							<Icon className="h-4 w-4 text-muted-foreground" />
						)}
					</div>
					<div className="min-w-0">
						<p className="truncate font-medium">{content.name}</p>
						<p className="text-xs text-muted-foreground capitalize">{share.type}</p>
					</div>
					{share.passwordHash && <Lock className="h-4 w-4 text-muted-foreground" />}
				</div>
			</TableCell>

			<TableCell className="hidden text-muted-foreground md:table-cell">{sizeLabel}</TableCell>
			<TableCell className="text-muted-foreground">
				{format(new Date(share.createdAt), "MMM d, yyyy")}
			</TableCell>
			<TableCell className="text-muted-foreground">
				{share.expiresAt ? (
					<span className={cn(expired && "text-destructive")}>
						{format(new Date(share.expiresAt), "MMM d, yyyy")}
					</span>
				) : (
					"Never"
				)}
			</TableCell>
			<TableCell className="hidden text-muted-foreground sm:table-cell">
				{share.viewCount ?? 0}
			</TableCell>
			<TableCell>
				{expired ? (
					<Badge variant="destructive">Expired</Badge>
				) : (
					<Badge variant="default">Active</Badge>
				)}
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<CopyLinkButton shareToken={share.token} />
					<RowActions shareToken={share.token} />
					{onDelete && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
							onClick={() => onDelete(share.id)}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
				</div>
			</TableCell>
		</TableRow>
	);
}

function RowActions({ shareToken }: { shareToken: string }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8">
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem asChild>
					<a href={getShareUrl(shareToken)} target="_blank" rel="noopener noreferrer">
						<ExternalLink className="mr-2 h-4 w-4" />
						Open Link
					</a>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function isExpired(expiresAt: Date | null): boolean {
	if (!expiresAt) {
		return false;
	}
	return new Date(expiresAt) < new Date();
}
