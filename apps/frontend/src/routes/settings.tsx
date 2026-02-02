import type { UserSettings } from "@petrel/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LogIn, Settings } from "lucide-react";
import { toast } from "sonner";
import { SettingsAccounts } from "@/components/settings/SettingsAccounts";
import { SettingsSharing } from "@/components/settings/SettingsSharing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

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

function SettingsPage() {
	const queryClient = useQueryClient();
	const { data: user } = useQuery({
		queryKey: ["currentUser"],
		queryFn: () => api.getCurrentUser(),
		retry: false,
	});

	const isAuthenticated = !!user;

	const { data: settings, isLoading } = useQuery<UserSettings>({
		queryKey: ["settings"],
		queryFn: async (): Promise<UserSettings> => {
			if (isAuthenticated) {
				return api.getSettings();
			}

			const defaultSettings = await api.getDefaultSettings();
			return { userId: 0, ...defaultSettings };
		},
		retry: false,
		enabled: true,
	});

	const updateMutation = useMutation({
		mutationFn: (updates: Partial<UserSettings>) => api.updateSettings(updates),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
			toast.success("Settings saved");
		},
		onError: (err: Error) => {
			console.error("Settings update error:", err);
			toast.error(`Failed to save settings: ${err.message}`);
		},
	});

	const resetMutation = useMutation({
		mutationFn: () => api.resetSettings(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
			toast.success("Settings reset to defaults");
		},
		onError: () => {
			toast.error("Failed to reset settings");
		},
	});

	function handleUpdate<K extends keyof UserSettings>(
		section: K,
		updates: Partial<UserSettings[K]>,
	): void {
		if (!settings) return;
		const sectionData = settings[section] as Record<string, unknown>;
		const mergedSection = deepMerge(sectionData, updates);
		const merged = { ...settings, [section]: mergedSection };
		updateMutation.mutate(merged as Partial<UserSettings>);
	}

	function handleReset(): void {
		if (window.confirm("Are you sure you want to reset all settings to defaults?")) {
			resetMutation.mutate();
		}
	}

	if (isLoading) {
		return (
			<div className="flex flex-col gap-6 p-6">
				<h1 className="text-2xl font-semibold">Loading settings...</h1>
			</div>
		);
	}

	if (!settings) {
		return (
			<div className="flex flex-col gap-6 p-6">
				<h1 className="text-2xl font-semibold">Failed to load settings</h1>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="flex flex-col gap-6 p-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold flex items-center gap-2">
							<Settings className="h-6 w-6" />
							Settings
						</h1>
						<p className="text-muted-foreground mt-1">Configure your preferences</p>
					</div>
				</div>

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
								<SettingsSharing settings={settings} onUpdate={() => {}} />
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
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold flex items-center gap-2">
						<Settings className="h-6 w-6" />
						Settings
					</h1>
					<p className="text-muted-foreground mt-1">Configure your preferences</p>
				</div>
				<Button variant="outline" onClick={handleReset}>
					Reset to Defaults
				</Button>
			</div>

			<Tabs defaultValue="sharing" className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="sharing">Sharing</TabsTrigger>
					{user?.role === "admin" && <TabsTrigger value="accounts">Accounts</TabsTrigger>}
				</TabsList>

				<TabsContent value="sharing">
					<Card>
						<CardHeader>
							<CardTitle>Sharing Defaults</CardTitle>
							<CardDescription>Set default preferences for new share links</CardDescription>
						</CardHeader>
						<CardContent>
							<SettingsSharing settings={settings} onUpdate={handleUpdate} />
						</CardContent>
					</Card>
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
		</div>
	);
}
