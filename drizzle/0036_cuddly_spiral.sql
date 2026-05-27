CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` varchar(512) NOT NULL,
	`auth` varchar(256) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `priceUsd` decimal(10,2);--> statement-breakpoint
ALTER TABLE `products` ADD `originalPriceUsd` decimal(10,2);