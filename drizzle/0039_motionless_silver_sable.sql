ALTER TABLE `orders` ADD `telegramMessages` json;--> statement-breakpoint
ALTER TABLE `products` ADD `isOfficial` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `reviews` ADD `replyBySeller` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `sellers` ADD `isTrusted` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerifyToken` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerifyExpires` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordResetToken` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordResetExpires` timestamp;