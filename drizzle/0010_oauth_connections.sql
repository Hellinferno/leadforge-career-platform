CREATE TABLE `oauth_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`account_email` text NOT NULL DEFAULT '',
	`account_name` text NOT NULL DEFAULT '',
	`access_token` text NOT NULL DEFAULT '',
	`refresh_token` text NOT NULL DEFAULT '',
	`scope` text NOT NULL DEFAULT '',
	`expires_at` integer NOT NULL DEFAULT 0,
	`synced_count` integer NOT NULL DEFAULT 0,
	`last_synced_at` text NOT NULL DEFAULT '',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_owner_provider_account` ON `oauth_connections` (`owner_id`, `provider`, `provider_account_id`);
--> statement-breakpoint
CREATE INDEX `oauth_owner_provider` ON `oauth_connections` (`owner_id`, `provider`);
