import {
	AlertCircle,
	ChevronLeft,
	ChevronRight,
	Loader2,
	RotateCw,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PDFViewerProps, PDFViewerState } from "./types";

// Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const SCALE_STEP = 0.25;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

/**
 * PDF viewer using pdf.js
 */
export function PDFViewer({ file, className }: PDFViewerProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
	const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

	const [state, setState] = useState<PDFViewerState>({
		currentPage: 1,
		totalPages: 0,
		scale: 1,
		isLoading: true,
		error: null,
	});

	const [rotation, setRotation] = useState(0);
	const [pageInputValue, setPageInputValue] = useState("1");

	// Load the PDF document
	useEffect(() => {
		async function loadPDF(): Promise<void> {
			try {
				setState((prev) => ({ ...prev, isLoading: true, error: null }));

				const loadingTask = pdfjsLib.getDocument(api.getDownloadUrl(file.id));
				const pdf = await loadingTask.promise;
				pdfDocRef.current = pdf;

				setState((prev) => ({
					...prev,
					totalPages: pdf.numPages,
					isLoading: false,
				}));
			} catch (_err) {
				setState((prev) => ({
					...prev,
					isLoading: false,
					error: "Failed to load PDF",
				}));
			}
		}

		loadPDF();

		return () => {
			if (pdfDocRef.current) {
				pdfDocRef.current.destroy();
				pdfDocRef.current = null;
			}
		};
	}, [file.id]);

	// Render the current page
	const renderPage = useCallback(async () => {
		const pdf = pdfDocRef.current;
		const canvas = canvasRef.current;
		if (!pdf || !canvas) return;

		// Cancel any pending render
		if (renderTaskRef.current) {
			renderTaskRef.current.cancel();
		}

		try {
			const page = await pdf.getPage(state.currentPage);
			const viewport = page.getViewport({ scale: state.scale, rotation });

			const context = canvas.getContext("2d");
			if (!context) return;

			canvas.height = viewport.height;
			canvas.width = viewport.width;

			const renderContext = {
				canvasContext: context,
				viewport: viewport,
				canvas: canvas,
			};

			renderTaskRef.current = page.render(renderContext);
			await renderTaskRef.current.promise;
		} catch (err) {
			// Ignore cancelled renders
			if (err instanceof Error && err.message.includes("cancelled")) {
				return;
			}
		}
	}, [state.currentPage, state.scale, rotation]);

	useEffect(() => {
		if (!state.isLoading && !state.error) {
			renderPage();
		}
	}, [renderPage, state.isLoading, state.error]);

	// Update page input when current page changes
	useEffect(() => {
		setPageInputValue(String(state.currentPage));
	}, [state.currentPage]);

	function goToPage(page: number): void {
		const validPage = Math.max(1, Math.min(page, state.totalPages));
		setState((prev) => ({ ...prev, currentPage: validPage }));
	}

	function handlePageInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
		setPageInputValue(e.target.value);
	}

	function handlePageInputSubmit(e: React.FormEvent): void {
		e.preventDefault();
		const page = parseInt(pageInputValue, 10);
		if (!Number.isNaN(page)) {
			goToPage(page);
		}
	}

	function zoomIn(): void {
		setState((prev) => ({
			...prev,
			scale: Math.min(prev.scale + SCALE_STEP, MAX_SCALE),
		}));
	}

	function zoomOut(): void {
		setState((prev) => ({
			...prev,
			scale: Math.max(prev.scale - SCALE_STEP, MIN_SCALE),
		}));
	}

	function rotate(): void {
		setRotation((prev) => (prev + 90) % 360);
	}

	// Keyboard navigation
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent): void {
			if (e.target instanceof HTMLInputElement) return;

			switch (e.key) {
				case "ArrowLeft":
				case "ArrowUp":
					goToPage(state.currentPage - 1);
					e.preventDefault();
					break;
				case "ArrowRight":
				case "ArrowDown":
					goToPage(state.currentPage + 1);
					e.preventDefault();
					break;
				case "+":
				case "=":
					zoomIn();
					e.preventDefault();
					break;
				case "-":
					zoomOut();
					e.preventDefault();
					break;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [state.currentPage, goToPage, zoomIn, zoomOut]);

	if (state.error) {
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-card p-8",
					className,
				)}
			>
				<AlertCircle className="h-12 w-12 text-destructive" />
				<p className="text-muted-foreground">{state.error}</p>
				<Button variant="outline" onClick={() => window.location.reload()}>
					Retry
				</Button>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col", className)}>
			{/* Toolbar */}
			<div className="flex items-center justify-between border-b border-border bg-card p-2">
				{/* Page navigation */}
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => goToPage(state.currentPage - 1)}
						disabled={state.currentPage <= 1 || state.isLoading}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>

					<form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
						<Input
							type="text"
							value={pageInputValue}
							onChange={handlePageInputChange}
							className="h-8 w-12 text-center"
							disabled={state.isLoading}
						/>
						<span className="text-sm text-muted-foreground">/ {state.totalPages}</span>
					</form>

					<Button
						variant="ghost"
						size="icon"
						onClick={() => goToPage(state.currentPage + 1)}
						disabled={state.currentPage >= state.totalPages || state.isLoading}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>

				{/* Zoom and rotate */}
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={zoomOut}
						disabled={state.scale <= MIN_SCALE || state.isLoading}
					>
						<ZoomOut className="h-4 w-4" />
					</Button>

					<span className="w-12 text-center text-sm text-muted-foreground">
						{Math.round(state.scale * 100)}%
					</span>

					<Button
						variant="ghost"
						size="icon"
						onClick={zoomIn}
						disabled={state.scale >= MAX_SCALE || state.isLoading}
					>
						<ZoomIn className="h-4 w-4" />
					</Button>

					<Button variant="ghost" size="icon" onClick={rotate} disabled={state.isLoading}>
						<RotateCw className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* PDF canvas */}
			<div
				ref={containerRef}
				className="flex flex-1 items-start justify-center overflow-auto bg-secondary/50 p-4"
			>
				{state.isLoading ? (
					<div className="flex h-64 items-center justify-center">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : (
					<canvas ref={canvasRef} className="shadow-lg" style={{ background: "white" }} />
				)}
			</div>
		</div>
	);
}
