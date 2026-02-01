import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CopyLinkButtonProps } from "./types";

/**
 * Get the full share URL for a token
 */
export function getShareUrl(token: string): string {
	return `${window.location.origin}/s/${token}`;
}

/**
 * Button that copies a share link to clipboard
 */
export function CopyLinkButton({ shareToken, className }: CopyLinkButtonProps) {
	const [copied, setCopied] = useState(false);

	async function handleCopy(): Promise<void> {
		try {
			await navigator.clipboard.writeText(getShareUrl(shareToken));
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (_err) {}
	}

	return (
		<Button variant="ghost" size="icon" className={cn("h-8 w-8", className)} onClick={handleCopy}>
			{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
		</Button>
	);
}
