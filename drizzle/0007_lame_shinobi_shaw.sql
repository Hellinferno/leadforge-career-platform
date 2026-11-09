CREATE TABLE `auth_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`bucket` integer NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
