CREATE TABLE `document_import_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceUrl` varchar(1200) NOT NULL,
	`fileName` varchar(255),
	`provider` varchar(80),
	`status` enum('queued','downloading','completed','failed','retried') NOT NULL DEFAULT 'queued',
	`errorMessage` text,
	`draftId` int,
	`mediaAssetId` int,
	`attempts` int NOT NULL DEFAULT 1,
	`requestedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `document_import_history_id` PRIMARY KEY(`id`)
);
