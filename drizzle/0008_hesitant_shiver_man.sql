CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`authorName` varchar(256) NOT NULL,
	`userId` int,
	`rating` int NOT NULL,
	`comment` text NOT NULL,
	`status` enum('pending','approved','hidden') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
