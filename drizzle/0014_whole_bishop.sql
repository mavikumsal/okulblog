ALTER TABLE `content_items` ADD `institutionCategoryId` int;--> statement-breakpoint
ALTER TABLE `qa_questions` ADD `institutionCategoryId` int;--> statement-breakpoint
ALTER TABLE `questions` ADD `institutionCategoryId` int;--> statement-breakpoint
ALTER TABLE `tests` ADD `institutionCategoryId` int;