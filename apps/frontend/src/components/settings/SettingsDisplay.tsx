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

interface SettingsDisplayProps {
	settings: UserSettings;
	onUpdate: <K extends keyof UserSettings>(section: K, updates: Partial<UserSettings[K]>) => void;
}

export function SettingsDisplay({ settings, onUpdate }: SettingsDisplayProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="font-semibold mb-4">Theme</h3>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="theme-mode">Mode</Label>
						<Select
							value={settings.display.theme.mode}
							onValueChange={(value) => onUpdate("display", { theme: { mode: value as any } })}
						>
							<SelectTrigger id="theme-mode">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="dark">Dark</SelectItem>
								<SelectItem value="light">Light</SelectItem>
								<SelectItem value="system">System</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="accent-color">Accent Color</Label>
						<Select
							value={settings.display.theme.accentColor}
							onValueChange={(value) =>
								onUpdate("display", { theme: { accentColor: value as any } })
							}
						>
							<SelectTrigger id="accent-color">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="orange">Orange</SelectItem>
								<SelectItem value="teal">Teal</SelectItem>
								<SelectItem value="purple">Purple</SelectItem>
								<SelectItem value="custom">Custom</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="font-size">Font Size</Label>
						<Select
							value={settings.display.theme.fontSize}
							onValueChange={(value) => onUpdate("display", { theme: { fontSize: value as any } })}
						>
							<SelectTrigger id="font-size">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="small">Small</SelectItem>
								<SelectItem value="medium">Medium</SelectItem>
								<SelectItem value="large">Large</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="sharp-corners">Sharp Corners</Label>
							<p className="text-xs text-muted-foreground">
								Use sharp corners for minimal aesthetic
							</p>
						</div>
						<Switch
							id="sharp-corners"
							checked={settings.display.theme.sharpCorners}
							onCheckedChange={(checked) =>
								onUpdate("display", { theme: { sharpCorners: checked } })
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="terminal-effects">Terminal Effects</Label>
							<p className="text-xs text-muted-foreground">Scan-line or CRT effects</p>
						</div>
						<Switch
							id="terminal-effects"
							checked={settings.display.theme.terminalEffects}
							onCheckedChange={(checked) =>
								onUpdate("display", { theme: { terminalEffects: checked } })
							}
						/>
					</div>
				</div>
			</div>

			<Separator />

			<div>
				<h3 className="font-semibold mb-4">File Browser</h3>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="default-view">Default View</Label>
						<Select
							value={settings.display.fileBrowser.defaultViewMode}
							onValueChange={(value) =>
								onUpdate("display", { fileBrowser: { defaultViewMode: value as any } })
							}
						>
							<SelectTrigger id="default-view">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="grid">Grid</SelectItem>
								<SelectItem value="list">List</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="show-hidden">Show Hidden Files</Label>
						</div>
						<Switch
							id="show-hidden"
							checked={settings.display.fileBrowser.showHiddenFiles}
							onCheckedChange={(checked) =>
								onUpdate("display", { fileBrowser: { showHiddenFiles: checked } })
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="folder-preview">Folder Thumbnail Preview</Label>
						</div>
						<Switch
							id="folder-preview"
							checked={settings.display.fileBrowser.folderThumbnailPreview}
							onCheckedChange={(checked) =>
								onUpdate("display", { fileBrowser: { folderThumbnailPreview: checked } })
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="items-per-page">
							Items Per Page ({settings.display.fileBrowser.itemsPerPage})
						</Label>
						<Slider
							id="items-per-page"
							value={[settings.display.fileBrowser.itemsPerPage]}
							onValueChange={([value]) =>
								onUpdate("display", { fileBrowser: { itemsPerPage: value } })
							}
							max={100}
							min={10}
							step={5}
							className="w-full"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="thumbnail-size">
							Thumbnail Size ({settings.display.fileBrowser.thumbnailSize}px)
						</Label>
						<Slider
							id="thumbnail-size"
							value={[settings.display.fileBrowser.thumbnailSize]}
							onValueChange={([value]) =>
								onUpdate("display", { fileBrowser: { thumbnailSize: value } })
							}
							max={500}
							min={100}
							step={25}
							className="w-full"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="default-sort">Default Sort By</Label>
						<Select
							value={settings.display.fileBrowser.defaultSortBy}
							onValueChange={(value) =>
								onUpdate("display", { fileBrowser: { defaultSortBy: value as any } })
							}
						>
							<SelectTrigger id="default-sort">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="name">Name</SelectItem>
								<SelectItem value="date">Date</SelectItem>
								<SelectItem value="size">Size</SelectItem>
								<SelectItem value="type">Type</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>
		</div>
	);
}
