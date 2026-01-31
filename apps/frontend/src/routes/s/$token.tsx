import type { File, Folder, Share, ShareSettings } from "@petrel/shared";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, FileQuestion, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { PasswordPrompt } from "@/components/sharing/PasswordPrompt";
import { ShareFileView } from "@/components/sharing/ShareFileView";
import { ShareFolderView } from "@/components/sharing/ShareFolderView";
import { ShareLayout } from "@/components/sharing/ShareLayout";
import { api } from "@/lib/api";

export const Route = createFileRoute("/s/$token")({
	component: SharePage,
});

interface ShareData {
	share: Share & ShareSettings;
	content: File | Folder;
	files?: File[];
	folders?: Folder[];
}

/**
 * Type guard to check if content is a File
 */
function isFile(content: File | Folder): content is File {
	return "mimeType" in content;
}

/**
 * SharePage - Public share view route
 *
 * Handles:
 * - Password-protected shares
 * - Expired shares
 * - File vs folder shares
 * - Error states
 */
function SharePage(): React.ReactNode {
	const { token } = Route.useParams();
	const [password, setPassword] = useState<string | undefined>(undefined);
	const [passwordError, setPasswordError] = useState<string | null>(null);

	const { data, isLoading, error } = useQuery<ShareData>({
		queryKey: ["share", token, password],
		queryFn: () => api.getShare(token, password),
		retry: false,
		enabled: !!token,
	});

	const handlePasswordSubmit = useCallback(
		async (enteredPassword: string) => {
			setPasswordError(null);
			setPassword(enteredPassword);

			// Refetch will happen automatically due to password being in queryKey
			try {
				const result = await api.getShare(token, enteredPassword);
				if (result) {
					// Password was correct, update state
					setPassword(enteredPassword);
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : "Invalid password";
				setPasswordError(message);
			}
		},
		[token],
	);

	// Loading state
	if (isLoading) {
		return (
			<ShareLayout>
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</ShareLayout>
		);
	}

	// Error handling
	if (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";

		// Password required
		if (errorMessage.includes("Invalid password") || errorMessage.includes("401")) {
			return (
				<ShareLayout title="Protected Share">
					<PasswordPrompt
						shareName={data?.content?.name}
						error={passwordError}
						onSubmit={handlePasswordSubmit}
					/>
				</ShareLayout>
			);
		}

		// Share expired
		if (errorMessage.includes("expired") || errorMessage.includes("410")) {
			return (
				<ShareLayout title="Share Expired">
					<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
						<AlertTriangle className="h-16 w-16 text-amber-500" />
						<h2 className="text-xl font-medium">This share has expired</h2>
						<p className="text-sm text-muted-foreground">
							The share link you're trying to access is no longer available.
						</p>
					</div>
				</ShareLayout>
			);
		}

		// Share not found
		if (errorMessage.includes("not found") || errorMessage.includes("404")) {
			return (
				<ShareLayout title="Not Found">
					<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
						<FileQuestion className="h-16 w-16 text-muted-foreground" />
						<h2 className="text-xl font-medium">Share not found</h2>
						<p className="text-sm text-muted-foreground">
							The share link you're trying to access doesn't exist or has been removed.
						</p>
					</div>
				</ShareLayout>
			);
		}

		// Generic error
		return (
			<ShareLayout title="Error">
				<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
					<AlertTriangle className="h-16 w-16 text-destructive" />
					<h2 className="text-xl font-medium">Something went wrong</h2>
					<p className="text-sm text-muted-foreground">{errorMessage}</p>
				</div>
			</ShareLayout>
		);
	}

	// No data
	if (!data || !data.content) {
		return (
			<ShareLayout title="Not Found">
				<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
					<FileQuestion className="h-16 w-16 text-muted-foreground" />
					<h2 className="text-xl font-medium">Content not found</h2>
					<p className="text-sm text-muted-foreground">The shared content could not be loaded.</p>
				</div>
			</ShareLayout>
		);
	}

	const { share, content, files, folders } = data;
	const expiresAt = share.expiresAt ? new Date(share.expiresAt) : null;

	// Render file share
	if (share.type === "file" && isFile(content)) {
		return (
			<ShareLayout title={content.name} expiresAt={expiresAt}>
				<ShareFileView file={content} shareToken={token} password={password} settings={share} />
			</ShareLayout>
		);
	}

	// Render folder share
	return (
		<ShareLayout expiresAt={expiresAt}>
			<ShareFolderView
				folder={content as Folder}
				files={files ?? []}
				folders={folders ?? []}
				shareToken={token}
				password={password}
				settings={share}
			/>
		</ShareLayout>
	);
}
