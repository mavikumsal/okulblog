CREATE TABLE `content_view_daily` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentId` int NOT NULL,
	`viewDay` varchar(10) NOT NULL,
	`viewCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_view_daily_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_view_daily_content_day_unique` UNIQUE(`contentId`,`viewDay`)
);
--> statement-breakpoint
CREATE TABLE `content_view_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentId` int NOT NULL,
	`userId` int,
	`viewerKey` varchar(160) NOT NULL,
	`viewDay` varchar(10) NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_view_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_view_events_viewer_day_unique` UNIQUE(`contentId`,`viewerKey`,`viewDay`)
);
--> statement-breakpoint
CREATE INDEX `content_view_daily_content_idx` ON `content_view_daily` (`contentId`);--> statement-breakpoint
CREATE INDEX `content_view_events_content_day_idx` ON `content_view_events` (`contentId`,`viewDay`);