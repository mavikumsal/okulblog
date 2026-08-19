CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` enum('delete','bulk_delete') NOT NULL,
	`targetType` varchar(80) NOT NULL,
	`targetId` int,
	`targetLabel` varchar(240),
	`actorId` int,
	`actorName` varchar(220),
	`status` enum('success','failed') NOT NULL,
	`reason` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
