CREATE TABLE `search_indexing_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url` varchar(900) NOT NULL,
	`entityType` varchar(60) NOT NULL,
	`entityId` int,
	`status` enum('pending','processing','submitted','failed','skipped') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`lastError` text,
	`lastResponse` json,
	`nextAttemptAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `search_indexing_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `search_indexing_queue_status_idx` ON `search_indexing_queue` (`status`,`nextAttemptAt`);--> statement-breakpoint
CREATE INDEX `search_indexing_queue_entity_idx` ON `search_indexing_queue` (`entityType`,`entityId`);