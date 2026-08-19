ALTER TABLE `document_import_drafts` ADD `ocrStatus` enum('not_needed','not_started','completed','failed') DEFAULT 'not_needed' NOT NULL;--> statement-breakpoint
ALTER TABLE `document_import_drafts` ADD `ocrConfidence` int;--> statement-breakpoint
ALTER TABLE `document_import_drafts` ADD `extractedText` text;