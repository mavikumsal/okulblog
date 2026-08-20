ALTER TABLE `questions` ADD `sourceFileName` varchar(255);--> statement-breakpoint
ALTER TABLE `questions` ADD `sourcePage` int;--> statement-breakpoint
ALTER TABLE `questions` ADD `sourceRegion` json;