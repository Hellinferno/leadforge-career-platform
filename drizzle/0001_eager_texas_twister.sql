CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`type` text DEFAULT 'internship' NOT NULL,
	`status` text DEFAULT 'saved' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`next_action_at` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_owner_dedupe` ON `jobs` (`owner_id`,`dedupe_key`);--> statement-breakpoint
ALTER TABLE `leads` ADD `linkedin_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `contact_type` text DEFAULT 'employee' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `job_title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `job_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `relevance` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `education` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `skills` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `evidence` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `target_role` text DEFAULT 'AI / Data Science internship' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `target_location` text DEFAULT 'India + remote' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `resume_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `portfolio_url` text DEFAULT '' NOT NULL;