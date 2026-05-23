ALTER TABLE `categories` ADD `slugUz` varchar(128);--> statement-breakpoint
ALTER TABLE `products` ADD `slugUz` varchar(256);--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_slugUz_unique` UNIQUE(`slugUz`);--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_slugUz_unique` UNIQUE(`slugUz`);