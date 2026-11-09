CREATE TABLE `message_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`goal` text NOT NULL,
	`step` integer NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drafts_owner_contact_goal_step` ON `message_drafts` (`owner_id`,`contact_id`,`goal`,`step`);