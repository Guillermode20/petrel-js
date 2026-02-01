import type { File, Folder, Share, ShareSettings } from "@petrel/shared";

export type ShareWithContent = Share & ShareSettings & { content: File | Folder };

export interface CreateShareModalProps {
	type: "file" | "folder";
	targetId: number;
	targetName: string;
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: (share: Share) => void;
}

export interface ShareTableProps {
	shares: ShareWithContent[];
	isLoading?: boolean;
	onDelete?: (shareId: number) => void;
	className?: string;
}

export interface CopyLinkButtonProps {
	shareToken: string;
	className?: string;
}

export interface QRCodeDisplayProps {
	shareToken: string;
	size?: number;
	className?: string;
}

export interface ShareCardProps {
	share: Share;
	onDelete?: () => void;
	className?: string;
}
