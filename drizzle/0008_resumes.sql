CREATE TABLE `resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text DEFAULT 'Untitled Resume' NOT NULL,
	`target_role` text DEFAULT '' NOT NULL,
	`data_json` text NOT NULL,
	`is_primary` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `resumes_owner_updated` ON `resumes` (`owner_id`,`updated_at`);
