import type { UserSettings } from "@petrel/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { SettingsDisplay } from "@/components/settings/SettingsDisplay";
import { SettingsPlayback } from "@/components/settings/SettingsPlayback";
import { SettingsProfile } from "@/components/settings/SettingsProfile";
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
	const {
		data: settings,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["settings"],
		queryFn: () => api.getSettings(),
		retry: false,
	});

	const updateMutation = useMutation({
		mutationFn: (updates: Partial<UserSettings>) => api.updateSettings(updates),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
			toast.success("Settings saved");
		},
		onError: () => {
			toast.error("Failed to save settings");
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

			<Tabs defaultValue="profile" className="w-full">
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="profile">Profile</TabsTrigger>
					<TabsTrigger value="playback">Playback</TabsTrigger>
					<TabsTrigger value="display">Display</TabsTrigger>
					<TabsTrigger value="sharing">Sharing</TabsTrigger>
				</TabsList>

				<TabsContent value="profile">
					<Card>
						<CardHeader>
							<CardTitle>Profile Settings</CardTitle>
							<CardDescription>Manage your profile and account</CardDescription>
						</CardHeader>
						<CardContent>
							<SettingsProfile settings={settings} onUpdate={handleUpdate} />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="playback">
					<Card>
						<CardHeader>
							<CardTitle>Playback Preferences</CardTitle>
							<CardDescription>Configure video and audio playback settings</CardDescription>
						</CardHeader>
						<CardContent>
							<SettingsPlayback settings={settings} onUpdate={handleUpdate} />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="display">
					<Card>
						<CardHeader>
							<CardTitle>Display & Interface</CardTitle>
							<CardDescription>Customize the look and feel</CardDescription>
						</CardHeader>
						<CardContent>
							<SettingsDisplay settings={settings} onUpdate={handleUpdate} />
						</CardContent>
					</Card>
				</TabsContent>

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
			</Tabs>
		</div>
	);
}
