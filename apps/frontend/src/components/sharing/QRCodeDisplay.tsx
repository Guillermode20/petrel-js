import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { getShareUrl } from "./CopyLinkButton";
import type { QRCodeDisplayProps } from "./types";

/**
 * Display a QR code for a share link
 */
export function QRCodeDisplay({ shareToken, size = 128, className }: QRCodeDisplayProps) {
	const url = getShareUrl(shareToken);

	return (
		<div
			className={cn(
				"flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4",
				className,
			)}
		>
			<div className="rounded-md bg-white p-2">
				<QRCodeSVG value={url} size={size} level="M" bgColor="transparent" fgColor="#0f0f10" />
			</div>
			<span className="text-xs text-muted-foreground max-w-full truncate">{url}</span>
		</div>
	);
}
