import type { UserSettings } from "@petrel/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Loader2, LogIn, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsAccounts } from "@/components/settings/SettingsAccounts";
import { SettingsErrorBoundary } from "@/components/settings/SettingsErrorBoundary";
import { SettingsSharing } from "@/components/settings/SettingsSharing";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

export const Route = createFileRoute("/settings")({
	component: SettingsPageWrapper,
});

/**
 * Error boundary wrapper for the settings page
 */
function SettingsPageWrapper() {
	const queryClient = useQueryClient();

	return (
		<SettingsErrorBoundary
			sectionName="Settings"
			onRetry={() => {
				queryClient.invalidateQueries({ queryKey: ["settings"] });
				queryClient.invalidateQueries({ queryKey: ["currentUser"] });
			}}
		>
			<SettingsPage />
		</SettingsErrorBoundary>
	);
}

/**
 * Deep merge utility for nested settings objects
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
	const output = { ...target };
	for (const key in source) {
		if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
			output[key] = deepMerge(
				(output[key] as Record<string, unknown>) || {},
				source[key] as Record<string, unknown>,
			) as T[Extract<keyof T, string>];
		} else {
			output[key] = source[key] as T[Extract<keyof T, string>];
		}
	}
	return output;
}

/**
 * Settings persistence status for user feedback
 */
type PersistenceStatus = "idle" | "saving" | "saved" | "error";

interface SettingsState {
	status: PersistenceStatus;
	lastError: string | null;
	lastSavedAt: Date | null;
}

function SettingsPage() {
	const queryClient = useQueryClient();
	const [persistenceState, setPersistenceState] = useState<SettingsState>({
		status: "idle",
		lastError: null,
		lastSavedAt: null,
	});

	const { data: user } = useQuery({
		queryKey: ["currentUser"],
		queryFn: () => api.getCurrentUser(),
		retry: false,
	});

	const isAuthenticated = !!user;

	const { data: settings, isLoading } = useQuery<UserSettings>({
		queryKey: ["settings", isAuthenticated],
		queryFn: async (): Promise<UserSettings> => {
			if (isAuthenticated) {
				return api.getSettings();
			}

			const defaultSettings = await api.getDefaultSettings();
			return { userId: 0, ...defaultSettings };
		},
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
		// Only run query after we know if user is authenticated
		enabled: user !== undefined,
	});

	const updateMutation = useMutation({
		mutationFn: (updates: Partial<UserSettings>) => api.updateSettings(updates),
		onMutate: async (updates: Partial<UserSettings>) => {
			// Cancel outgoing refetches to avoid overwriting optimistic update
			await queryClient.cancelQueries({ queryKey: ["settings"] });

			// Snapshot previous value for rollback
			const previousSettings = queryClient.getQueryData<UserSettings>(["settings"]);

			// Optimistically update to new value
			if (previousSettings) {
				const optimisticSettings = { ...previousSettings };
				for (const sectionKey in updates) {
					if (sectionKey === "userId") continue;
					const section = sectionKey as keyof UserSettings;
					const sectionUpdates = updates[section] as Record<string, unknown>;
					if (sectionUpdates && typeof sectionUpdates === "object") {
						const currentSection = optimisticSettings[section] as Record<string, unknown>;
						(optimisticSettings[section] as Record<string, unknown>) = deepMerge(
							currentSection,
							sectionUpdates,
						);
					}
				}
				queryClient.setQueryData(["settings"], optimisticSettings);
			}

			setPersistenceState((prev) => ({ ...prev, status: "saving" }));

			return { previousSettings };
		},
		onError: (err: Error, _updates, context) => {
			// Rollback to previous value on error
			if (context?.previousSettings) {
				queryClient.setQueryData(["settings"], context.previousSettings);
			}

			logger.error("Settings update error:", err);
			setPersistenceState({
				status: "error",
				lastError: err.message,
				lastSavedAt: null,
			});
			toast.error(`Failed to save settings: ${err.message}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
			setPersistenceState({
				status: "saved",
				lastError: null,
				lastSavedAt: new Date(),
			});
			toast.success("Settings saved successfully");

			// Reset to idle after 3 seconds
			setTimeout(() => {
				setPersistenceState((prev) => ({ ...prev, status: "idle" }));
			}, 3000);
		},
		onSettled: () => {
			// Always refetch after error or success to ensure sync
			queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});

	const resetMutation = useMutation({
		mutationFn: () => api.resetSettings(),
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: ["settings"] });
			const previousSettings = queryClient.getQueryData<UserSettings>(["settings"]);
			setPersistenceState((prev) => ({ ...prev, status: "saving" }));
			return { previousSettings };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
			setPersistenceState({
				status: "saved",
				lastError: null,
				lastSavedAt: new Date(),
			});
			toast.success("Settings reset to defaults");
			setTimeout(() => {
				setPersistenceState((prev) => ({ ...prev, status: "idle" }));
			}, 3000);
		},
		onError: (err: Error, _variables, context) => {
			if (context?.previousSettings) {
				queryClient.setQueryData(["settings"], context.previousSettings);
			}
			setPersistenceState({
				status: "error",
				lastError: err.message,
				lastSavedAt: null,
			});
			toast.error("Failed to reset settings");
		},
	});

	/**
	 * Handle settings updates - only send changed section/fields
	 * This prevents race conditions and reduces payload size
	 */
	function handleUpdate<K extends keyof UserSettings>(
		section: K,
		updates: Partial<UserSettings[K]>,
	): void {
		if (!settings || !isAuthenticated) return;

		// Send only the specific section update, not the entire settings object
		const sectionUpdate = { [section]: updates } as Partial<UserSettings>;

		updateMutation.mutate(sectionUpdate);
	}

	function handleReset(): void {
		if (
			window.confirm(
				"Are you sure you want to reset all settings to defaults? This action cannot be undone.",
			)
		) {
			resetMutation.mutate();
		}
	}

	function handleRetry(): void {
		// Retry the last failed mutation by invalidating and refetching
		queryClient.invalidateQueries({ queryKey: ["settings"] });
		setPersistenceState({
			status: "idle",
			lastError: null,
			lastSavedAt: null,
		});
	}

	const getStatusIndicator = (): React.ReactNode => {
		switch (persistenceState.status) {
			case "saving":
				return (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Saving...</span>
					</div>
				);
			case "saved":
				return (
					<div className="flex items-center gap-2 text-sm text-green-600">
						<Save className="h-4 w-4" />
						<span>Saved</span>
					</div>
				);
			case "error":
				return (
					<div className="flex items-center gap-2 text-sm text-destructive">
						<AlertCircle className="h-4 w-4" />
						<span>Save failed</span>
					</div>
				);
			default:
				return null;
		}
	};

	if (isLoading) {
		return (
			<div className="flex flex-col gap-6 p-6">
				<h1 className="text-2xl font-semibold">Loading settings...</h1>
				<div className="flex items-center gap-2 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>Retrieving your preferences...</span>
				</div>
			</div>
		);
	}

	if (!settings) {
		return (
			<div className="flex flex-col gap-6 p-6">
				<h1 className="text-2xl font-semibold">Failed to load settings</h1>
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						Unable to load your settings. Please try refreshing the page.
					</AlertDescription>
				</Alert>
				<Button onClick={handleRetry} variant="outline">
					Retry
				</Button>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="flex flex-col gap-6 p-6">
				<Card>
					<CardContent className="p-6">
						<div className="flex flex-col items-center gap-4 text-center">
							<LogIn className="h-12 w-12 text-muted-foreground" />
							<div>
								<h3 className="text-lg font-semibold">Login Required</h3>
								<p className="text-muted-foreground mt-1">
									Please login to access and customize your settings.
								</p>
							</div>
							<Link to="/">
								<Button>
									<LogIn className="h-4 w-4 mr-2" />
									Login
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Default Settings Preview</CardTitle>
						<CardDescription>
							These are the default settings that will be applied when you create an account.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="sharing" className="w-full">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="sharing">Sharing</TabsTrigger>
								<TabsTrigger value="accounts">Accounts</TabsTrigger>
							</TabsList>
							<TabsContent value="sharing">
								<SettingsSharing settings={settings} onUpdate={() => {}} disabled />
							</TabsContent>
							<TabsContent value="accounts">
								<div className="text-muted-foreground">Login required</div>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex items-center justify-end gap-4">
				{getStatusIndicator()}
				<Button variant="outline" onClick={handleReset} disabled={resetMutation.isPending}>
					{resetMutation.isPending ? (
						<>
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							Resetting...
						</>
					) : (
						"Reset to Defaults"
					)}
				</Button>
			</div>

			{persistenceState.lastError && (
				<Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription className="flex items-center justify-between">
						<span>Error: {persistenceState.lastError}</span>
						<Button variant="outline" size="sm" onClick={handleRetry}>
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			)}

			<Tabs defaultValue="sharing" className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="sharing">Sharing</TabsTrigger>
					{user?.role === "admin" && <TabsTrigger value="accounts">Accounts</TabsTrigger>}
				</TabsList>

				<TabsContent value="sharing">
					<SettingsErrorBoundary sectionName="Sharing Settings" onRetry={handleRetry}>
						<Card>
							<CardHeader>
								<CardTitle>Sharing Defaults</CardTitle>
								<CardDescription>Set default preferences for new share links</CardDescription>
							</CardHeader>
							<CardContent>
								<SettingsSharing
									settings={settings}
									onUpdate={handleUpdate}
									isSaving={updateMutation.isPending}
								/>
							</CardContent>
						</Card>
					</SettingsErrorBoundary>
				</TabsContent>

				{user?.role === "admin" && (
					<TabsContent value="accounts">
						<Card>
							<CardContent className="pt-6">
								<SettingsAccounts currentUserRole={user.role} />
							</CardContent>
						</Card>
					</TabsContent>
				)}
			</Tabs>

			{persistenceState.lastSavedAt && persistenceState.status === "idle" && (
				<p className="text-xs text-muted-foreground text-right">
					Last saved: {persistenceState.lastSavedAt.toLocaleTimeString()}
				</p>
			)}
		</div>
	);
}
