import type { ServerSettings } from "@petrel/shared";
import { Loader2, Music } from "lucide-react";
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

interface SettingsServerProps {
	settings: ServerSettings;
	onUpdate: (updates: Partial<ServerSettings>) => void;
	disabled?: boolean;
	isSaving?: boolean;
}

export function SettingsServer({
	settings,
	onUpdate,
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

			<div className="space-y-4">
				<div className="flex items-center gap-3">
					<Music className="h-5 w-5 text-muted-foreground" />
					<h3 className="font-medium">Audio Transcoding</h3>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="flac-transcode">FLAC to Opus Transcoding</Label>
						<p className="text-xs text-muted-foreground">
							Convert FLAC files to Opus format on-the-fly for better browser compatibility
						</p>
					</div>
					<Switch
						id="flac-transcode"
						checked={settings.transcoding.audioTranscodeFlac}
						onCheckedChange={(checked) =>
							onUpdate({
								transcoding: {
									...settings.transcoding,
									audioTranscodeFlac: checked,
								},
							})
						}
						disabled={disabled || isSaving}
					/>
				</div>

				{settings.transcoding.audioTranscodeFlac && (
					<div className="space-y-2 pl-4 border-l-2 border-muted">
						<Label htmlFor="opus-bitrate">Opus Bitrate</Label>
						<p className="text-xs text-muted-foreground mb-2">
							Target bitrate for transcoded Opus files (higher = better quality, larger files)
						</p>
						<Select
							value={settings.transcoding.audioOpusBitrateKbps.toString()}
							onValueChange={(value: string) =>
								onUpdate({
									transcoding: {
										...settings.transcoding,
										audioOpusBitrateKbps: parseInt(value, 10),
									},
								})
							}
							disabled={disabled || isSaving}
						>
							<SelectTrigger id="opus-bitrate" className="w-32">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="64">64 kbps</SelectItem>
								<SelectItem value="96">96 kbps</SelectItem>
								<SelectItem value="128">128 kbps</SelectItem>
								<SelectItem value="160">160 kbps</SelectItem>
								<SelectItem value="192">192 kbps</SelectItem>
								<SelectItem value="256">256 kbps</SelectItem>
								<SelectItem value="320">320 kbps</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}
			</div>

			<Separator />

			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					<strong>Note:</strong> Changes to server settings take effect immediately and apply to
					all users. Transcoded audio files are cached and will be reused for subsequent
					requests.
				</p>
			</div>
		</div>
	);
}
