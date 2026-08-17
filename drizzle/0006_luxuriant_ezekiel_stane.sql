CREATE TABLE `media_asset_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mediaAssetId` int NOT NULL,
	`targetType` enum('content','test') NOT NULL,
	`targetId` int NOT NULL,
	`role` varchar(80) NOT NULL DEFAULT 'attachment',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_asset_links_id` PRIMARY KEY(`id`)
);
