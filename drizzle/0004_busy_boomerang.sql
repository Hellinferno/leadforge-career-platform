CREATE TABLE `people_search_cache` (
	`owner_id` text NOT NULL,
	`query_hash` text NOT NULL,
	`page_json` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_cache_owner_query` ON `people_search_cache` (`owner_id`,`query_hash`);--> statement-breakpoint
CREATE INDEX `people_cache_owner_expiry` ON `people_search_cache` (`owner_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `people_search_limits` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`day_key` text NOT NULL,
	`day_count` integer NOT NULL,
	`month_key` text NOT NULL,
	`month_count` integer NOT NULL,
	`next_allowed_at` integer NOT NULL
);
