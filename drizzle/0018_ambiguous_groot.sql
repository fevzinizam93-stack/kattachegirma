CREATE TABLE `seller_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`userId` int,
	`authorName` varchar(128) NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seller_reviews_id` PRIMARY KEY(`id`)
);
