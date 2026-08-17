CREATE TABLE `qa_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`body` text NOT NULL,
	`imageUrl` varchar(700),
	`status` enum('pending','published','hidden') NOT NULL DEFAULT 'pending',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qa_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qa_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(220) NOT NULL,
	`body` text NOT NULL,
	`imageUrl` varchar(700),
	`status` enum('pending','published','hidden') NOT NULL DEFAULT 'pending',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qa_questions_id` PRIMARY KEY(`id`)
);
