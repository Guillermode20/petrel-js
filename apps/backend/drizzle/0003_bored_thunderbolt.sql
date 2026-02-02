CREATE TABLE `user_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`settings` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_settings_user_id_idx` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `zip_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`temp_path` text,
	`error` text,
	`file_ids` text,
	`folder_ids` text,
	`share_token` text,
	`user_id` integer,
	`total_size` integer DEFAULT 0,
	`file_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	`downloaded_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zip_jobs_job_id_unique` ON `zip_jobs` (`job_id`);--> statement-breakpoint
CREATE INDEX `zip_jobs_job_id_idx` ON `zip_jobs` (`job_id`);--> statement-breakpoint
CREATE INDEX `zip_jobs_status_idx` ON `zip_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `zip_jobs_created_at_idx` ON `zip_jobs` (`created_at`);--> statement-breakpoint
ALTER TABLE `shares` ADD `created_by` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `shares` ADD `created_at` integer DEFAULT (unixepoch()) NOT NULL;