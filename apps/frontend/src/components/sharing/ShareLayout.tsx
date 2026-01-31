import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ShareLayoutProps {
	title?: string;
	expiresAt?: Date | null;
	children: ReactNode;
	className?: string;
}

/**
 * Calculates hours remaining until expiry
 */
function getHoursRemaining(expiresAt: Date): number {
	const now = Date.now();
	const expiryTime = expiresAt.getTime();
	return Math.max(0, Math.floor((expiryTime - now) / (1000 * 60 * 60)));
}

/**
 * Formats time remaining for display
 */
function formatTimeRemaining(expiresAt: Date): string {
	const hoursRemaining = getHoursRemaining(expiresAt);

	if (hoursRemaining < 1) {
		const minutesRemaining = Math.max(
			0,
			Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60)),
		);
		return `${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}`;
	}

	if (hoursRemaining < 24) {
		return `${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""}`;
	}

	const daysRemaining = Math.floor(hoursRemaining / 24);
	return `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`;
}

/**
 * Expiry warning banner component
 */
function ExpiryWarning({ expiresAt }: { expiresAt: Date }): React.ReactNode {
	const hoursRemaining = getHoursRemaining(expiresAt);

	// Only show warning if expires within 24 hours
	if (hoursRemaining >= 24) {
		return null;
	}

	return (
		<div className="flex items-center justify-center gap-2 bg-amber-500/10 px-4 py-2 text-amber-500">
			<AlertTriangle className="h-4 w-4" />
			<span className="text-sm">This share expires in {formatTimeRemaining(expiresAt)}</span>
		</div>
	);
}

/**
 * ShareLayout - Clean, minimal wrapper for public share pages
 *
 * Features:
 * - No sidebar navigation
 * - Simple header with share name
 * - "Powered by Petrel" footer
 * - Expiry warning banner (when expires within 24h)
 */
export function ShareLayout({
	title,
	expiresAt,
	children,
	className,
}: ShareLayoutProps): React.ReactNode {
	return (
		<div className={cn("flex min-h-screen flex-col bg-background", className)}>
			{/* Expiry warning banner */}
			{expiresAt && <ExpiryWarning expiresAt={expiresAt} />}

			{/* Header */}
			{title && (
				<header className="flex items-center justify-center border-b border-border px-4 py-3 bg-card">
					<h1 className="text-lg font-medium text-foreground">{title}</h1>
				</header>
			)}

			{/* Main content */}
			<main className="flex flex-1 flex-col">{children}</main>

			{/* Footer */}
			<footer className="flex items-center justify-center border-t border-border py-4">
				<span className="text-xs text-muted-foreground">
					Powered by{" "}
					<a
						href="https://github.com/petrel-project/petrel"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						Petrel
					</a>
				</span>
			</footer>
		</div>
	);
}
