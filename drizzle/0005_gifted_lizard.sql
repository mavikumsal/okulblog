CREATE TABLE `media_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('s3','google-drive-personal','google-drive-workspace','bunny-storage','bunny-stream') NOT NULL,
	`providerAssetId` varchar(500),
	`fileName` varchar(255) NOT NULL,
	`publicUrl` varchar(900),
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` int,
	`folderPath` varchar(500),
	`contentType` enum('test','document','video','simulation','game','news','general') NOT NULL DEFAULT 'general',
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`metadata` json,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_transfer_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mediaAssetId` int NOT NULL,
	`sourceProvider` enum('s3','google-drive-personal','google-drive-workspace','bunny-storage','bunny-stream') NOT NULL,
	`targetProvider` enum('s3','google-drive-personal','google-drive-workspace','bunny-storage','bunny-stream') NOT NULL,
	`operation` enum('copy','move') NOT NULL,
	`status` enum('queued','running','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
	`progress` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`requestedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_transfer_jobs_id` PRIMARY KEY(`id`)
);
