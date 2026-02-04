import type { ServerSettings } from "@petrel/shared";
import { Loader2, Settings } from "lucide-react";

interface SettingsServerProps {
	settings: ServerSettings;
	onUpdate: (updates: Partial<ServerSettings>) => void;
	disabled?: boolean;
	isSaving?: boolean;
}

export function SettingsServer({
	disabled = false,
	isSaving = false,
}: SettingsServerProps) {
	const SavingOverlay = () =>
		isSaving ? (
			<div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		) : null;

	return (
		<div className="space-y-6 relative">
			<SavingOverlay />

			<div className="flex items-center gap-3">
				<Settings className="h-5 w-5 text-muted-foreground" />
				<h3 className="font-medium">Server Settings</h3>
			</div>

			<p className="text-sm text-muted-foreground">
				No configurable server settings available. Server configuration is managed via environment variables.
			</p>
		</div>
	);
}
