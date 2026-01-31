import { FolderPlus } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CreateFolderDialogProps {
	onCreateFolder: (name: string) => Promise<void>;
	isCreating?: boolean;
}

/**
 * Dialog for creating a new folder
 */
export function CreateFolderDialog({ onCreateFolder, isCreating }: CreateFolderDialogProps) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");

	const handleCreate = useCallback(async () => {
		if (!name.trim()) return;
		try {
			await onCreateFolder(name.trim());
			setName("");
			setOpen(false);
		} catch {
			// Error handled by parent
		}
	}, [name, onCreateFolder]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleCreate();
			}
		},
		[handleCreate],
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 gap-2">
					<FolderPlus className="h-3.5 w-3.5" />
					<span className="hidden sm:inline">New folder</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Create folder</DialogTitle>
					<DialogDescription>Enter a name for the new folder.</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<Input
						placeholder="Folder name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={handleKeyDown}
						autoFocus
					/>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
						{isCreating ? "Creating..." : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface RenameDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentName: string;
	onRename: (newName: string) => Promise<void>;
	isRenaming?: boolean;
}

/**
 * Dialog for renaming a file or folder
 */
export function RenameDialog({
	open,
	onOpenChange,
	currentName,
	onRename,
	isRenaming,
}: RenameDialogProps) {
	const [name, setName] = useState(currentName);

	const handleRename = useCallback(async () => {
		if (!name.trim() || name.trim() === currentName) return;
		try {
			await onRename(name.trim());
			onOpenChange(false);
		} catch {
			// Error handled by parent
		}
	}, [name, currentName, onRename, onOpenChange]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleRename();
			}
		},
		[handleRename],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Rename</DialogTitle>
					<DialogDescription>Enter a new name.</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<Input
						placeholder="New name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={handleKeyDown}
						autoFocus
					/>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleRename}
						disabled={!name.trim() || name.trim() === currentName || isRenaming}
					>
						{isRenaming ? "Renaming..." : "Rename"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface DeleteConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	itemName: string;
	itemType: "file" | "folder";
	onConfirm: () => Promise<void>;
	isDeleting?: boolean;
}

/**
 * Confirmation dialog for deleting files/folders
 */
export function DeleteConfirmDialog({
	open,
	onOpenChange,
	itemName,
	itemType,
	onConfirm,
	isDeleting,
}: DeleteConfirmDialogProps) {
	const handleDelete = useCallback(async () => {
		try {
			await onConfirm();
			onOpenChange(false);
		} catch {
			// Error handled by parent
		}
	}, [onConfirm, onOpenChange]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Delete {itemType}</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete "{itemName}"? This action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
						{isDeleting ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
