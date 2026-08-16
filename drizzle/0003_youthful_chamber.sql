CREATE TABLE `news_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(150) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `news_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_categories_name_unique` UNIQUE(`name`),
	CONSTRAINT `news_categories_slug_unique` UNIQUE(`slug`)
);
