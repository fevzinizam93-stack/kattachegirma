ALTER TABLE `orders` ADD `managerId` varchar(32);--> statement-breakpoint
ALTER TABLE `orders` ADD `managerName` varchar(128);--> statement-breakpoint
ALTER TABLE `orders` ADD `takenAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `telegramUsername` varchar(128);