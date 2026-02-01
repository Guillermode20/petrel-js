import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export interface ZipDownloadState {
	jobId: string | null;
	status: "idle" | "pending" | "processing" | "completed" | "error" | "cancelled";
	progress: number;
	error: string | null;
	isPolling: boolean;
}

export interface ZipDownloadOptions {
	shareToken?: string;
	password?: string;
	filename?: string;
	pollInterval?: number;
	maxPollTime?: number;
	onComplete?: () => void;
	onError?: (error: string) => void;
}

const DEFAULT_POLL_INTERVAL = 2000; // 2 seconds
const DEFAULT_MAX_POLL_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for managing ZIP download with polling and cleanup
 *
 * Features:
 * - Automatic polling for job status
 * - Cleanup on component unmount
 * - Exponential backoff for polling intervals
 * - Timeout protection
 * - Download triggering
 */
export function useZipDownload(options: ZipDownloadOptions = {}) {
	const {
		shareToken,
		password,
		filename,
		pollInterval = DEFAULT_POLL_INTERVAL,
		maxPollTime = DEFAULT_MAX_POLL_TIME,
		onComplete,
		onError,
	} = options;

	const [state, setState] = useState<ZipDownloadState>({
		jobId: null,
		status: "idle",
		progress: 0,
		error: null,
		isPolling: false,
	});

	const timeoutRef = useRef<number | null>(null);
	const pollStartTimeRef = useRef<number>(0);
	const attemptsRef = useRef<number>(0);
	const abortControllerRef = useRef<AbortController | null>(null);

	/**
	 * Clear any pending timeouts
	 */
	const clearPendingTimeout = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	/**
	 * Cancel any ongoing polling
	 */
	const cancelPolling = useCallback(() => {
		clearPendingTimeout();
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
		setState((prev) => ({
			...prev,
			isPolling: false,
			status: prev.status === "processing" ? "cancelled" : prev.status,
		}));
	}, [clearPendingTimeout]);

	/**
	 * Reset the state to idle
	 */
	const reset = useCallback(() => {
		cancelPolling();
		setState({
			jobId: null,
			status: "idle",
			progress: 0,
			error: null,
			isPolling: false,
		});
		pollStartTimeRef.current = 0;
		attemptsRef.current = 0;
	}, [cancelPolling]);

	/**
	 * Trigger the actual file download
	 */
	const triggerDownload = useCallback(
		(jobId: string) => {
			let downloadUrl: string;
			if (shareToken) {
				downloadUrl = api.getZipDownloadUrl(shareToken, jobId, password, filename);
			} else {
				downloadUrl = api.getAuthZipDownloadUrl(jobId, filename);
			}

			// Create a temporary link and click it
			const link = document.createElement("a");
			link.href = downloadUrl;
			link.style.display = "none";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		},
		[shareToken, password, filename],
	);

	/**
	 * Poll for job status
	 */
	const pollStatus = useCallback(
		async (jobId: string) => {
			// Check for timeout
			if (Date.now() - pollStartTimeRef.current > maxPollTime) {
				setState((prev) => ({
					...prev,
					status: "error",
					error: "Download timed out after 5 minutes",
					isPolling: false,
				}));
				onError?.("Download timed out");
				return;
			}

			try {
				let status: { jobId: string; status: string; progress?: number };

				if (shareToken) {
					status = await api.getZipDownloadStatus(shareToken, jobId, password);
				} else {
					status = await api.getAuthZipDownloadStatus(jobId);
				}

				if (status.status === "completed") {
					setState((prev) => ({
						...prev,
						status: "completed",
						progress: 100,
						isPolling: false,
					}));
					triggerDownload(jobId);
					onComplete?.();
				} else if (status.status === "error") {
					setState((prev) => ({
						...prev,
						status: "error",
						error: "Failed to create ZIP archive",
						isPolling: false,
					}));
					onError?.("Failed to create ZIP archive");
				} else if (status.status === "cancelled") {
					setState((prev) => ({
						...prev,
						status: "cancelled",
						isPolling: false,
					}));
				} else {
					// Still processing - continue polling with exponential backoff
					setState((prev) => ({
						...prev,
						status: status.status as "processing" | "pending",
						progress: status.progress ?? prev.progress,
						isPolling: true,
					}));

					attemptsRef.current++;
					const backoffDelay = Math.min(
						pollInterval * 1.5 ** Math.min(attemptsRef.current, 5),
						10000, // Max 10 seconds
					);

					timeoutRef.current = window.setTimeout(() => {
						void pollStatus(jobId);
					}, backoffDelay);
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to check download status";
				setState((prev) => ({
					...prev,
					status: "error",
					error: errorMessage,
					isPolling: false,
				}));
				onError?.(errorMessage);
			}
		},
		[shareToken, password, pollInterval, maxPollTime, onComplete, onError, triggerDownload],
	);

	/**
	 * Start a ZIP download
	 */
	const startDownload = useCallback(
		async (fileIds: number[], folderIds?: number[]) => {
			// Cancel any existing polling
			cancelPolling();

			try {
				let result: { jobId: string; status: string };

				if (shareToken) {
					result = await api.createZipDownload(shareToken, fileIds, folderIds, password);
				} else {
					result = await api.createAuthZipDownload(fileIds, folderIds);
				}

				setState({
					jobId: result.jobId,
					status: "processing",
					progress: 0,
					error: null,
					isPolling: true,
				});

				pollStartTimeRef.current = Date.now();
				attemptsRef.current = 0;

				// Start polling
				timeoutRef.current = window.setTimeout(() => {
					void pollStatus(result.jobId);
				}, pollInterval);

				return result.jobId;
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to start download";
				setState((prev) => ({
					...prev,
					status: "error",
					error: errorMessage,
					isPolling: false,
				}));
				throw err;
			}
		},
		[shareToken, password, pollInterval, cancelPolling, pollStatus],
	);

	/**
	 * Cleanup on unmount
	 */
	useEffect(() => {
		return () => {
			cancelPolling();
		};
	}, [cancelPolling]);

	return {
		...state,
		startDownload,
		cancelPolling,
		reset,
		triggerDownload,
	};
}
