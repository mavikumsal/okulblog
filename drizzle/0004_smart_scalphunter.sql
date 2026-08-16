CREATE TABLE `home_slides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eyebrow` varchar(100),
	`title` varchar(240) NOT NULL,
	`description` text,
	`buttonLabel` varchar(80),
	`buttonLink` varchar(500),
	`imageUrl` varchar(700),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `home_slides_id` PRIMARY KEY(`id`)
);
