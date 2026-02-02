import type { ExpiryDuration, UserSettings, VideoQuality } from "@petrel/shared";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface SettingsSharingProps {
	settings: UserSettings;
	onUpdate: <K extends keyof UserSettings>(section: K, updates: Partial<UserSettings[K]>) => void;
	disabled?: boolean;
	isSaving?: boolean;
}

export function SettingsSharing({
	settings,
	onUpdate,
	disabled = false,
	isSaving = false,
}: SettingsSharingProps) {
	const SavingOverlay = () =>
		isSaving ? (
			<div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		) : null;

	return (
		<div className="space-y-6 relative">
			<SavingOverlay />

			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="default-expiry">Default Expiry Duration</Label>
					<Select
						value={settings.sharing.defaultExpiry}
						onValueChange={(value: string) => onUpdate("sharing", { defaultExpiry: value as ExpiryDuration })}
						disabled={disabled || isSaving}
					>
						<SelectTrigger id="default-expiry">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="1h">1 hour</SelectItem>
							<SelectItem value="24h">24 hours</SelectItem>
							<SelectItem value="7d">7 days</SelectItem>
							<SelectItem value="30d">30 days</SelectItem>
							<SelectItem value="never">Never</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="default-quality">Default Quality for Videos</Label>
					<Select
						value={settings.sharing.defaultQuality}
						onValueChange={(value: string) => onUpdate("sharing", { defaultQuality: value as VideoQuality })}
						disabled={disabled || isSaving}
					>
						<SelectTrigger id="default-quality">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="auto">Auto</SelectItem>
							<SelectItem value="1080p">1080p</SelectItem>
							<SelectItem value="720p">720p</SelectItem>
							<SelectItem value="480p">480p</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="default-password-protected">Default Password Protection</Label>
						<p className="text-xs text-muted-foreground">Require password for new shares</p>
					</div>
					<Switch
						id="default-password-protected"
						checked={settings.sharing.defaultPasswordProtection}
						onCheckedChange={(checked) =>
							onUpdate("sharing", { defaultPasswordProtection: checked })
						}
						disabled={disabled || isSaving}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="default-download">Allow Downloads by Default</Label>
					</div>
					<Switch
						id="default-download"
						checked={settings.sharing.defaultDownloadPermission}
						onCheckedChange={(checked) =>
							onUpdate("sharing", { defaultDownloadPermission: checked })
						}
						disabled={disabled || isSaving}
					/>
				</div>
			</div>

			<Separator />

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="analytics-optout">Analytics Opt-Out</Label>
						<p className="text-xs text-muted-foreground">Disable analytics for personal shares</p>
					</div>
					<Switch
						id="analytics-optout"
						checked={settings.sharing.analyticsOptOut}
						onCheckedChange={(checked) => onUpdate("sharing", { analyticsOptOut: checked })}
						disabled={disabled || isSaving}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="auto-expire">Auto-Expire Old Shares</Label>
						<p className="text-xs text-muted-foreground">
							Automatically expire shares after {settings.sharing.autoExpireOldShares.thresholdDays}{" "}
							days
						</p>
					</div>
					<Switch
						id="auto-expire"
						checked={settings.sharing.autoExpireOldShares.enabled}
						onCheckedChange={(checked) =>
							onUpdate("sharing", {
								autoExpireOldShares: {
									enabled: checked,
									thresholdDays: settings.sharing.autoExpireOldShares.thresholdDays,
								},
							})
						}
						disabled={disabled || isSaving}
					/>
				</div>
			</div>
		</div>
	);
}
