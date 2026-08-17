CREATE TABLE `search_console_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyUrl` varchar(700) NOT NULL,
	`encryptedAccessToken` text NOT NULL,
	`encryptedRefreshToken` text,
	`accessTokenExpiresAt` timestamp,
	`scopes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `search_console_tokens_id` PRIMARY KEY(`id`)
);
