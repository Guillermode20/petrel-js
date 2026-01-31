import { AlertCircle, Edit2, Loader2, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { MarkdownViewerProps } from "./types";
import "highlight.js/styles/github-dark.css";

/**
 * Markdown viewer with proper rendering and editing support
 * Uses react-markdown with GFM and syntax highlighting
 */
export function MarkdownViewer({ file, className }: MarkdownViewerProps) {
	const [content, setContent] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		async function fetchMarkdown(): Promise<void> {
			try {
				setIsLoading(true);
				setError(null);

				const response = await fetch(api.getDownloadUrl(file.id));
				if (!response.ok) {
					throw new Error("Failed to fetch file");
				}

				const text = await response.text();
				setContent(text);
				setEditContent(text);
			} catch (_err) {
				setError("Failed to load markdown");
			} finally {
				setIsLoading(false);
			}
		}

		fetchMarkdown();
	}, [file.id]);

	async function handleSave(): Promise<void> {
		try {
			setIsSaving(true);
			await api.updateFileContent(file.id, editContent);
			setContent(editContent);
			setIsEditing(false);
		} catch (_err) {
			setError("Failed to save file");
		} finally {
			setIsSaving(false);
		}
	}

	function handleCancel(): void {
		setEditContent(content);
		setIsEditing(false);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
		if (e.ctrlKey && e.key === "s") {
			e.preventDefault();
			handleSave();
		}
		if (e.key === "Escape") {
			handleCancel();
		}
	}

	if (isLoading) {
		return (
			<div
				className={cn(
					"flex h-64 items-center justify-center rounded-lg border border-border bg-card",
					className,
				)}
			>
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-card p-8",
					className,
				)}
			>
				<AlertCircle className="h-12 w-12 text-destructive" />
				<p className="text-muted-foreground">{error}</p>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex flex-col overflow-hidden rounded-lg border border-border bg-card",
				className,
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-4 py-2">
				<span className="text-sm font-medium">{file.name}</span>
				<div className="flex items-center gap-2">
					{isEditing ? (
						<>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleCancel}
								disabled={isSaving}
								className="gap-2"
							>
								<X className="h-4 w-4" />
								Cancel
							</Button>
							<Button
								variant="default"
								size="sm"
								onClick={handleSave}
								disabled={isSaving}
								className="gap-2"
							>
								{isSaving ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Saving...
									</>
								) : (
									<>
										<Save className="h-4 w-4" />
										Save
									</>
								)}
							</Button>
						</>
					) : (
						<Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
							<Edit2 className="h-4 w-4" />
							Edit
						</Button>
					)}
				</div>
			</div>

			{/* Content */}
			{isEditing ? (
				<Textarea
					value={editContent}
					onChange={(e) => setEditContent(e.target.value)}
					onKeyDown={handleKeyDown}
					className="flex-1 resize-none border-0 p-4 font-mono text-sm focus-visible:ring-0"
					placeholder="Start typing..."
				/>
			) : (
				<ScrollArea className="flex-1">
					<div className="prose prose-invert prose-pink max-w-none p-6">
						<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
							{content}
						</ReactMarkdown>
					</div>
				</ScrollArea>
			)}
		</div>
	);
}
