ALTER TABLE `media_transfer_jobs` ADD `destinationProviderAssetId` varchar(255);--> statement-breakpoint
ALTER TABLE `media_transfer_jobs` ADD `destinationUrl` text;--> statement-breakpoint
ALTER TABLE `media_transfer_jobs` ADD `sourceArchived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `media_transfer_jobs` ADD `referencesUpdated` boolean DEFAULT false NOT NULL;