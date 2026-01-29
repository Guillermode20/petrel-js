DROP TABLE `album_files`;--> statement-breakpoint
DROP TABLE `albums`;--> statement-breakpoint
ALTER TABLE `files` ADD `parent_id` integer REFERENCES folders(id);--> statement-breakpoint
ALTER TABLE `files` ADD `thumbnail_path` text;