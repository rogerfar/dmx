CREATE TABLE `fixtures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` integer NOT NULL,
	`channel_count` integer NOT NULL,
	`channel_labels` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scene_values` (
	`scene_id` integer NOT NULL,
	`fixture_id` integer NOT NULL,
	`channel` integer NOT NULL,
	`value` integer NOT NULL,
	PRIMARY KEY(`scene_id`, `fixture_id`, `channel`),
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fixture_id`) REFERENCES `fixtures`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slot` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scenes_slot_unique` ON `scenes` (`slot`);