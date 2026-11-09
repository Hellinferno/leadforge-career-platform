CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`company` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`industry` text DEFAULT '' NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT 'new' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`source_kind` text DEFAULT 'manual' NOT NULL,
	`researched_at` text DEFAULT '' NOT NULL,
	`next_action_at` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_owner_dedupe` ON `leads` (`owner_id`,`dedupe_key`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`business_name` text DEFAULT '' NOT NULL,
	`offer` text DEFAULT '' NOT NULL,
	`signature` text DEFAULT 'Ravi' NOT NULL,
	`target_market` text DEFAULT 'USA / UK' NOT NULL
);
