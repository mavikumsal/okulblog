ALTER TABLE `document_import_drafts` ADD `aiSuggestedTitle` varchar(220);--> statement-breakpoint
ALTER TABLE `document_import_drafts` ADD `aiSuggestedSummary` text;--> statement-breakpoint
ALTER TABLE `document_import_drafts` ADD `aiSuggestedTags` json;