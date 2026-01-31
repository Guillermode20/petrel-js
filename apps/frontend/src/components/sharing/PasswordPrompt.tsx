import { Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PasswordPromptProps {
	shareName?: string;
	error?: string | null;
	isLoading?: boolean;
	onSubmit: (password: string) => void;
	className?: string;
}

/**
 * PasswordPrompt - Password entry form for protected shares
 *
 * Displays a centered card with:
 * - Lock icon
 * - Share name (if provided)
 * - Password input field
 * - Submit button
 * - Error message for invalid password
 */
export function PasswordPrompt({
	shareName,
	error,
	isLoading = false,
	onSubmit,
	className,
}: PasswordPromptProps): React.ReactNode {
	const [password, setPassword] = useState("");

	function handleSubmit(e: React.FormEvent): void {
		e.preventDefault();
		if (password.trim()) {
			onSubmit(password);
		}
	}

	return (
		<div className={cn("flex flex-1 items-center justify-center p-4", className)}>
			<div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
				{/* Header */}
				<div className="mb-6 flex flex-col items-center gap-3 text-center">
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
						<Lock className="h-6 w-6 text-muted-foreground" />
					</div>
					<div>
						<h2 className="text-lg font-medium">Password Protected</h2>
						{shareName && <p className="mt-1 text-sm text-muted-foreground">{shareName}</p>}
					</div>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Input
							type="password"
							placeholder="Enter password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							disabled={isLoading}
							autoFocus
							className={cn(error && "border-destructive")}
						/>
						{error && <p className="mt-2 text-sm text-destructive">{error}</p>}
					</div>

					<Button type="submit" className="w-full" disabled={isLoading || !password.trim()}>
						{isLoading ? "Verifying..." : "Access Share"}
					</Button>
				</form>
			</div>
		</div>
	);
}
