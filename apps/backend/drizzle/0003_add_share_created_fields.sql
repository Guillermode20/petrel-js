ALTER TABLE `shares` ADD `created_by` integer REFERENCES users(id);
--> statement-breakpoint
ALTER TABLE `shares` ADD `created_at` integer DEFAULT (unixepoch()) NOT NULL;
