CREATE TABLE `content_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contentType` enum('test','document','simulation','video','game','news') NOT NULL,
	`contentId` int NOT NULL,
	`status` enum('started','completed') NOT NULL DEFAULT 'completed',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contentType` enum('test','document','simulation','video','game','news') NOT NULL,
	`contentId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `test_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`testId` int NOT NULL,
	`correctCount` int NOT NULL DEFAULT 0,
	`wrongCount` int NOT NULL DEFAULT 0,
	`blankCount` int NOT NULL DEFAULT 0,
	`score` int NOT NULL DEFAULT 0,
	`durationSeconds` int NOT NULL DEFAULT 0,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `test_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `content_items` ADD `coverImageUrl` varchar(700);--> statement-breakpoint
ALTER TABLE `tests` ADD `coverImageUrl` varchar(700);--> statement-breakpoint
ALTER TABLE `tests` ADD `durationMinutes` int DEFAULT 20 NOT NULL;