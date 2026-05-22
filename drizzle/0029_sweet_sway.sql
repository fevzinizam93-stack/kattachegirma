ALTER TABLE `products` ADD `clickCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `products` ADD `salesCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `products` ADD `hitScore` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `products` ADD `isHitManual` boolean DEFAULT false;