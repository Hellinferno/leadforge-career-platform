CREATE TABLE `network_people` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`identity_key` text NOT NULL,
	`data_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `network_owner_identity` ON `network_people` (`owner_id`,`identity_key`);--> statement-breakpoint
CREATE INDEX `network_owner_updated` ON `network_people` (`owner_id`,`updated_at`);