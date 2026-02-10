import type { ServerSettings } from "@petrel/shared";
import { Loader2, Lock, ScrollText, Settings, Users, Video, Zap } from "lucide-react";
import { useId, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type SizeUnit = "MB" | "GB" | "TB";

/**
 * Convert bytes to value and unit for display
 */
function bytesToSize(bytes: number): { value: number; unit: SizeUnit } {
	if (bytes >= 1024 * 1024 * 1024 * 1024) {
		return { value: Math.round((bytes / (1024 * 1024 * 1024 * 1024)) * 100) / 100, unit: "TB" };
	}
	if (bytes >= 1024 * 1024 * 1024) {
		return { value: Math.round((bytes / (1024 * 1024 * 1024)) * 100) / 100, unit: "GB" };
	}
	return { value: Math.round((bytes / (1024 * 1024)) * 100) / 100, unit: "MB" };
}

/**
 * Convert value and unit to bytes for storage
 */
function sizeToBytes(value: number, unit: SizeUnit): number {
	switch (unit) {
		case "TB":
			return Math.round(value * 1024 * 1024 * 1024 * 1024);
		case "GB":
			return Math.round(value * 1024 * 1024 * 1024);
		case "MB":
			return Math.round(value * 1024 * 1024);
	}
}

/**
 * Saving overlay component
 */
function SavingOverlay({ isSaving }: { isSaving: boolean }) {
	if (!isSaving) return null;
	return (
		<div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded z-10">
			<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
		</div>
	);
}

/**
 * Number input with unit selector for size values
 */
function SizeInput({
	value,
	onChange,
	min,
	max,
	units,
	disabled,
	placeholder,
}: {
	value: number;
	onChange: (bytes: number) => void;
	min?: number;
	max?: number;
	units: SizeUnit[];
	disabled?: boolean;
	placeholder?: string;
}) {
	const { value: displayValue, unit } = bytesToSize(value);
	const [localValue, setLocalValue] = useState<string>(String(displayValue));
	const [localUnit, setLocalUnit] = useState<SizeUnit>(unit);

	const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setLocalValue(newValue);

		const numValue = Number.parseFloat(newValue);
		if (!Number.isNaN(numValue)) {
			let finalValue = numValue;
			if (min !== undefined && finalValue < min) finalValue = min;
			if (max !== undefined && finalValue > max) finalValue = max;
			onChange(sizeToBytes(finalValue, localUnit));
		}
	};

	const handleUnitChange = (newUnit: SizeUnit) => {
		setLocalUnit(newUnit);
		const numValue = Number.parseFloat(localValue);
		if (!Number.isNaN(numValue)) {
			onChange(sizeToBytes(numValue, newUnit));
		}
	};

	return (
		<div className="flex items-center gap-2">
			<Input
				type="number"
				value={localValue}
				onChange={handleValueChange}
				min={min}
				max={max}
				disabled={disabled}
				placeholder={placeholder}
				className="flex-1"
			/>
			<Select value={localUnit} onValueChange={handleUnitChange} disabled={disabled}>
				<SelectTrigger className="w-20">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{units.map((u) => (
						<SelectItem key={u} value={u}>
							{u}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

/**
 * General settings section
 */
function GeneralSettingsSection({
	settings,
	onUpdate,
	disabled,
}: {
	settings: ServerSettings["general"];
	onUpdate: (updates: Partial<ServerSettings["general"]>) => void;
	disabled: boolean;
}) {
	const baseId = useId();
	const appNameId = `${baseId}-app-name`;
	const uploadSizeId = `${baseId}-upload-size`;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<Settings className="h-5 w-5 text-muted-foreground" />
					<CardTitle>General Settings</CardTitle>
				</div>
				<CardDescription>Basic server configuration options</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor={appNameId}>Application Name</Label>
					<Input
						id={appNameId}
						value={settings.appName}
						onChange={(e) => onUpdate({ appName: e.target.value })}
						placeholder="Enter application name"
						disabled={disabled}
						maxLength={100}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor={uploadSizeId}>Maximum Upload Size</Label>
					<SizeInput
						value={settings.maxUploadSize}
						onChange={(bytes) => onUpdate({ maxUploadSize: bytes })}
						min={1}
						max={10240}
						units={["MB", "GB"]}
						disabled={disabled}
						placeholder="Maximum file upload size"
					/>
					<p className="text-xs text-muted-foreground">Maximum size for individual file uploads</p>
				</div>

				<div className="space-y-2">
					<Label>Default Folder View</Label>
					<div className="flex items-center gap-4">
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								name={`${baseId}-folder-view`}
								value="grid"
								checked={settings.defaultFolderView === "grid"}
								onChange={() => onUpdate({ defaultFolderView: "grid" })}
								disabled={disabled}
								className="accent-primary"
							/>
							<span className="text-sm">Grid</span>
						</label>
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								name={`${baseId}-folder-view`}
								value="list"
								checked={settings.defaultFolderView === "list"}
								onChange={() => onUpdate({ defaultFolderView: "list" })}
								disabled={disabled}
								className="accent-primary"
							/>
							<span className="text-sm">List</span>
						</label>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Guest access section
 */
function GuestAccessSection({
	settings,
	onUpdate,
	disabled,
}: {
	settings: ServerSettings["guestAccess"];
	onUpdate: (updates: Partial<ServerSettings["guestAccess"]>) => void;
	disabled: boolean;
}) {
	const baseId = useId();
	const enabledId = `${baseId}-enabled`;
	const approvalId = `${baseId}-approval`;
	const quotaId = `${baseId}-quota`;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<Users className="h-5 w-5 text-muted-foreground" />
					<CardTitle>Guest Access</CardTitle>
				</div>
				<CardDescription>Configure anonymous user access and quotas</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor={enabledId}>Enable Guest Access</Label>
						<p className="text-xs text-muted-foreground">
							Allow unauthenticated users to access the server
						</p>
					</div>
					<Switch
						id={enabledId}
						checked={settings.enabled}
						onCheckedChange={(checked) => onUpdate({ enabled: checked })}
						disabled={disabled}
					/>
				</div>

				<Separator />

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor={approvalId}>Require Approval</Label>
						<p className="text-xs text-muted-foreground">
							New guest accounts require admin approval
						</p>
					</div>
					<Switch
						id={approvalId}
						checked={settings.requireApproval}
						onCheckedChange={(checked) => onUpdate({ requireApproval: checked })}
						disabled={disabled || !settings.enabled}
					/>
				</div>

				<Separator />

				<div className="space-y-2">
					<Label htmlFor={quotaId}>Default Quota</Label>
					<SizeInput
						value={settings.defaultQuota}
						onChange={(bytes) => onUpdate({ defaultQuota: bytes })}
						min={0}
						max={102400}
						units={["MB", "GB", "TB"]}
						disabled={disabled || !settings.enabled}
						placeholder="0 for unlimited"
					/>
					<p className="text-xs text-muted-foreground">
						Storage quota per guest user (0 = unlimited)
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Transcoding section
 */
function TranscodingSection({
	settings,
	onUpdate,
	disabled,
}: {
	settings: ServerSettings["transcoding"];
	onUpdate: (updates: Partial<ServerSettings["transcoding"]>) => void;
	disabled: boolean;
}) {
	const baseId = useId();
	const enabledId = `${baseId}-enabled`;
	const resolutionId = `${baseId}-resolution`;
	const autoTranscodeId = `${baseId}-auto`;
	const jobsId = `${baseId}-jobs`;
	const deleteOriginalId = `${baseId}-delete`;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<Video className="h-5 w-5 text-muted-foreground" />
					<CardTitle>Video Transcoding</CardTitle>
				</div>
				<CardDescription>Configure video processing and transcoding options</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor={enabledId}>Enable Transcoding</Label>
						<p className="text-xs text-muted-foreground">
							Allow video transcoding for compatibility
						</p>
					</div>
					<Switch
						id={enabledId}
						checked={settings.enabled}
						onCheckedChange={(checked) => onUpdate({ enabled: checked })}
						disabled={disabled}
					/>
				</div>

				<Separator />

				<div className="space-y-2">
					<Label htmlFor={resolutionId}>Maximum Resolution</Label>
					<Select
						value={settings.maxResolution}
						onValueChange={(value: "1080p" | "720p" | "480p") => onUpdate({ maxResolution: value })}
						disabled={disabled || !settings.enabled}
					>
						<SelectTrigger id={resolutionId}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="1080p">1080p (Full HD)</SelectItem>
							<SelectItem value="720p">720p (HD)</SelectItem>
							<SelectItem value="480p">480p (SD)</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor={autoTranscodeId}>Auto-Transcode</Label>
						<p className="text-xs text-muted-foreground">
							Automatically transcode incompatible videos
						</p>
					</div>
					<Switch
						id={autoTranscodeId}
						checked={settings.autoTranscode}
						onCheckedChange={(checked) => onUpdate({ autoTranscode: checked })}
						disabled={disabled || !settings.enabled}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor={jobsId}>Parallel Transcode Jobs</Label>
					<Select
						value={String(settings.parallelJobs)}
						onValueChange={(value) => onUpdate({ parallelJobs: Number.parseInt(value, 10) })}
						disabled={disabled || !settings.enabled}
					>
						<SelectTrigger id={jobsId}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="1">1 job</SelectItem>
							<SelectItem value="2">2 jobs</SelectItem>
							<SelectItem value="3">3 jobs</SelectItem>
							<SelectItem value="4">4 jobs</SelectItem>
							<SelectItem value="5">5 jobs</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">Number of simultaneous transcoding jobs</p>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor={deleteOriginalId}>Delete Original After Transcode</Label>
						<p className="text-xs text-muted-foreground">
							Remove original file after successful transcoding
						</p>
					</div>
					<Switch
						id={deleteOriginalId}
						checked={settings.deleteOriginal}
						onCheckedChange={(checked) => onUpdate({ deleteOriginal: checked })}
						disabled={disabled || !settings.enabled}
					/>
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * ZIP download section
 */
function ZipDownloadSection({
	settings,
	onUpdate,
	disabled,
}: {
	settings: ServerSettings["zipDownload"];
	onUpdate: (updates: Partial<ServerSettings["zipDownload"]>) => void;
	disabled: boolean;
}) {
	const baseId = useId();
	const enabledId = `${baseId}-enabled`;
	const maxSizeId = `${baseId}-max-size`;
	const maxFilesId = `${baseId}-max-files`;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<Zap className="h-5 w-5 text-muted-foreground" />
					<CardTitle>ZIP Downloads</CardTitle>
				</div>
				<CardDescription>Configure bulk download archive settings</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor={enabledId}>Enable ZIP Downloads</Label>
						<p className="text-xs text-muted-foreground">
							Allow users to download multiple files as ZIP archives
						</p>
					</div>
					<Switch
						id={enabledId}
						checked={settings.enabled}
						onCheckedChange={(checked) => onUpdate({ enabled: checked })}
						disabled={disabled}
					/>
				</div>

				<Separator />

				<div className="space-y-2">
					<Label htmlFor={maxSizeId}>Maximum ZIP Size</Label>
					<SizeInput
						value={settings.maxSize}
						onChange={(bytes) => onUpdate({ maxSize: bytes })}
						min={1}
						max={10240}
						units={["MB", "GB"]}
						disabled={disabled || !settings.enabled}
						placeholder="Maximum ZIP archive size"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor={maxFilesId}>Maximum Files in ZIP</Label>
					<Input
						id={maxFilesId}
						type="number"
						min={1}
						max={1000}
						value={settings.maxFiles}
						onChange={(e) => onUpdate({ maxFiles: Number.parseInt(e.target.value, 10) || 1 })}
						disabled={disabled || !settings.enabled}
					/>
					<p className="text-xs text-muted-foreground">
						Maximum number of files allowed in a single ZIP archive
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Logging section
 */
function LoggingSection({
	settings,
	onUpdate,
	disabled,
}: {
	settings: ServerSettings["logging"];
	onUpdate: (updates: Partial<ServerSettings["logging"]>) => void;
	disabled: boolean;
}) {
	const baseId = useId();
	const levelId = `${baseId}-level`;
	const retainId = `${baseId}-retain`;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<ScrollText className="h-5 w-5 text-muted-foreground" />
					<CardTitle>Logging</CardTitle>
				</div>
				<CardDescription>Configure server logging and retention</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor={levelId}>Log Level</Label>
					<Select
						value={settings.level}
						onValueChange={(value: "debug" | "info" | "warn" | "error") =>
							onUpdate({ level: value })
						}
						disabled={disabled}
					>
						<SelectTrigger id={levelId}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="debug">Debug (Verbose)</SelectItem>
							<SelectItem value="info">Info (Standard)</SelectItem>
							<SelectItem value="warn">Warn (Warnings only)</SelectItem>
							<SelectItem value="error">Error (Errors only)</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor={retainId}>Retain Logs For (days)</Label>
					<Input
						id={retainId}
						type="number"
						min={1}
						max={365}
						value={settings.retainDays}
						onChange={(e) => onUpdate({ retainDays: Number.parseInt(e.target.value, 10) || 30 })}
						disabled={disabled}
					/>
					<p className="text-xs text-muted-foreground">
						Number of days to keep log files before automatic cleanup
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Admin notice footer
 */
function AdminNotice() {
	return (
		<div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
			<Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
			<div className="space-y-1">
				<p className="text-sm font-medium">Admin-Only Settings</p>
				<p className="text-xs text-muted-foreground">
					These settings affect all users on the server. Changes are applied immediately and may
					impact active sessions.
				</p>
			</div>
		</div>
	);
}

/**
 * Server settings component for admin users
 * Allows configuration of server-wide settings across 5 sections:
 * - General Settings
 * - Guest Access
 * - Transcoding
 * - ZIP Downloads
 * - Logging
 */
export function SettingsServer({
	settings,
	onUpdate,
	disabled = false,
	isSaving = false,
}: SettingsServerProps) {
	const isDisabled = disabled || isSaving;

	const handleGeneralUpdate = (updates: Partial<ServerSettings["general"]>) => {
		onUpdate({ general: { ...settings.general, ...updates } });
	};

	const handleGuestAccessUpdate = (updates: Partial<ServerSettings["guestAccess"]>) => {
		onUpdate({ guestAccess: { ...settings.guestAccess, ...updates } });
	};

	const handleTranscodingUpdate = (updates: Partial<ServerSettings["transcoding"]>) => {
		onUpdate({ transcoding: { ...settings.transcoding, ...updates } });
	};

	const handleZipDownloadUpdate = (updates: Partial<ServerSettings["zipDownload"]>) => {
		onUpdate({ zipDownload: { ...settings.zipDownload, ...updates } });
	};

	const handleLoggingUpdate = (updates: Partial<ServerSettings["logging"]>) => {
		onUpdate({ logging: { ...settings.logging, ...updates } });
	};

	return (
		<div className="space-y-6 relative">
			<SavingOverlay isSaving={isSaving} />

			<GeneralSettingsSection
				settings={settings.general}
				onUpdate={handleGeneralUpdate}
				disabled={isDisabled}
			/>

			<GuestAccessSection
				settings={settings.guestAccess}
				onUpdate={handleGuestAccessUpdate}
				disabled={isDisabled}
			/>

			<TranscodingSection
				settings={settings.transcoding}
				onUpdate={handleTranscodingUpdate}
				disabled={isDisabled}
			/>

			<ZipDownloadSection
				settings={settings.zipDownload}
				onUpdate={handleZipDownloadUpdate}
				disabled={isDisabled}
			/>

			<LoggingSection
				settings={settings.logging}
				onUpdate={handleLoggingUpdate}
				disabled={isDisabled}
			/>

			<AdminNotice />
		</div>
	);
}
