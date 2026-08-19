CREATE TABLE `outcome_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`outcomeId` int NOT NULL,
	`status` enum('started','completed') NOT NULL DEFAULT 'completed',
	`questionCount` int NOT NULL DEFAULT 0,
	`documentViewed` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outcome_progress_id` PRIMARY KEY(`id`)
);
