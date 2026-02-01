import type { File, Folder } from "@petrel/shared";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { isFile } from "./utils/selection";

export interface FilePropertiesProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: File | Folder;
}

function Row({ label, value }: { label: string; value: string }): React.ReactNode {
	return (
		<div className="flex items-start justify-between gap-4">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className="text-xs text-foreground text-right break-all">{value}</span>
		</div>
	);
}

function formatDate(value: Date | null | undefined): string {
	if (!value) return "—";
	try {
		return format(value, "yyyy-MM-dd HH:mm");
	} catch {
		return String(value);
	}
}

export function FileProperties({ open, onOpenChange, item }: FilePropertiesProps): React.ReactNode {
	const isFileItem = isFile(item);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={cn("max-w-lg")}>
				<DialogHeader>
					<DialogTitle className="truncate">Properties: {item.name}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2 rounded-md border border-border bg-secondary/20 p-3">
						<Row label="Type" value={isFileItem ? "File" : "Folder"} />
						<Row label="ID" value={String(item.id)} />
						<Row label="Path" value={item.path} />
						{"createdAt" in item && <Row label="Created" value={formatDate(item.createdAt)} />}
						{"parentId" in item && <Row label="Parent ID" value={item.parentId === null ? "—" : String(item.parentId)} />}
						{isFileItem && (
							<>
								<Row label="Size" value={`${item.size} bytes`} />
								<Row label="MIME type" value={item.mimeType} />
								<Row label="Hash" value={item.hash} />
								<Row label="Uploaded by" value={item.uploadedBy === null ? "—" : String(item.uploadedBy)} />
							</>
						)}
					</div>

					{isFileItem && item.metadata && (
						<div className="space-y-2 rounded-md border border-border bg-secondary/10 p-3">
							<div className="text-xs font-medium">Metadata</div>
							{"duration" in item.metadata && (
								<Row label="Duration (s)" value={String(item.metadata.duration)} />
							)}
							{"width" in item.metadata && "height" in item.metadata && (
								<Row label="Dimensions" value={`${item.metadata.width} × ${item.metadata.height}`} />
							)}
							{"codec" in item.metadata && <Row label="Codec" value={String(item.metadata.codec)} />}
							{"format" in item.metadata && <Row label="Format" value={String(item.metadata.format)} />}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

