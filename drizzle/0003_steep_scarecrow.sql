CREATE TABLE `activity_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`request_id` text NOT NULL,
	`event_type` text NOT NULL,
	`channel` text NOT NULL,
	`occurred_on` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`stage_after` text DEFAULT '' NOT NULL,
	`follow_up_on` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_owner_request` ON `activity_entries` (`owner_id`,`request_id`);--> statement-breakpoint
CREATE INDEX `activity_owner_contact_date` ON `activity_entries` (`owner_id`,`contact_id`,`occurred_on`,`created_at`);