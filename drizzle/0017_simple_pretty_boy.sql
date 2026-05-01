ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','seller','vip') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `products` ADD `costPrice` decimal(12,2);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `telegramId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `vipExpiresAt` timestamp;