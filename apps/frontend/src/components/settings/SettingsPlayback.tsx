import type { UserSettings } from "@petrel/shared";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface SettingsPlaybackProps {
	settings: UserSettings;
	onUpdate: <K extends keyof UserSettings>(section: K, updates: Partial<UserSettings[K]>) => void;
}

export function SettingsPlayback({ settings, onUpdate }: SettingsPlaybackProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="font-semibold mb-4">Video</h3>
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="autoplay-next">Autoplay Next</Label>
							<p className="text-xs text-muted-foreground">
								Automatically play next video in folder
							</p>
						</div>
						<Switch
							id="autoplay-next"
							checked={settings.playback.video.autoplayNext}
							onCheckedChange={(checked) =>
								onUpdate("playback", { video: { autoplayNext: checked } })
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="remember-position">Remember Playback Position</Label>
							<p className="text-xs text-muted-foreground">Resume from where you left off</p>
						</div>
						<Switch
							id="remember-position"
							checked={settings.playback.video.rememberPlaybackPosition}
							onCheckedChange={(checked) =>
								onUpdate("playback", { video: { rememberPlaybackPosition: checked } })
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="default-quality">Default Quality</Label>
						<Select
							value={settings.playback.video.defaultQuality}
							onValueChange={(value: any) =>
								onUpdate("playback", { video: { defaultQuality: value } })
							}
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

					<div className="space-y-3">
						<Label htmlFor="default-volume">
							Default Volume ({settings.playback.video.defaultVolume}%)
						</Label>
						<Slider
							id="default-volume"
							value={[settings.playback.video.defaultVolume]}
							onValueChange={([value]) => onUpdate("playback", { video: { defaultVolume: value } })}
							max={100}
							min={0}
							step={1}
							className="w-full"
						/>
					</div>

					<div className="space-y-3">
						<Label htmlFor="default-speed">
							Default Playback Speed ({settings.playback.video.defaultPlaybackSpeed}x)
						</Label>
						<Slider
							id="default-speed"
							value={[settings.playback.video.defaultPlaybackSpeed]}
							onValueChange={([value]) =>
								onUpdate("playback", { video: { defaultPlaybackSpeed: value } })
							}
							max={2}
							min={0.5}
							step={0.25}
							className="w-full"
						/>
					</div>
				</div>
			</div>

			<Separator />

			<div>
				<h3 className="font-semibold mb-4">Audio</h3>
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="volume-normalization">Volume Normalization</Label>
							<p className="text-xs text-muted-foreground">Normalize audio volume across tracks</p>
						</div>
						<Switch
							id="volume-normalization"
							checked={settings.playback.audio.volumeNormalization}
							onCheckedChange={(checked) =>
								onUpdate("playback", { audio: { volumeNormalization: checked } })
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="gapless-playback">Gapless Playback</Label>
							<p className="text-xs text-muted-foreground">Seamless transitions between tracks</p>
						</div>
						<Switch
							id="gapless-playback"
							checked={settings.playback.audio.gaplessPlayback}
							onCheckedChange={(checked) =>
								onUpdate("playback", { audio: { gaplessPlayback: checked } })
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="visualizer-style">Visualizer Style</Label>
						<Select
							value={settings.playback.audio.visualizerStyle}
							onValueChange={(value: any) =>
								onUpdate("playback", { audio: { visualizerStyle: value } })
							}
						>
							<SelectTrigger id="visualizer-style">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="waveform">Waveform</SelectItem>
								<SelectItem value="spectrum">Spectrum</SelectItem>
								<SelectItem value="none">None</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>
		</div>
	);
}
