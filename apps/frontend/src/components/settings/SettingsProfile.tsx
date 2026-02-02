import type { UserSettings } from "@petrel/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsProfileProps {
	settings: UserSettings;
	onUpdate: <K extends keyof UserSettings>(section: K, updates: Partial<UserSettings[K]>) => void;
}

export function SettingsProfile({ settings, onUpdate }: SettingsProfileProps) {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Label htmlFor="username">Username</Label>
				<Input
					id="username"
					value={settings.profile.username}
					onChange={(e) => onUpdate("profile", { username: e.target.value })}
					placeholder="Enter username"
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="display-name">Display Name</Label>
				<Input
					id="display-name"
					value={settings.profile.displayName ?? ""}
					onChange={(e) => onUpdate("profile", { displayName: e.target.value || null })}
					placeholder="Enter display name (optional)"
				/>
			</div>
		</div>
	);
}
