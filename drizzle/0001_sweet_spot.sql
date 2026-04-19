CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`icon` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerName` varchar(256) NOT NULL,
	`customerPhone` varchar(32) NOT NULL,
	`deliveryAddress` text NOT NULL,
	`items` json NOT NULL,
	`totalAmount` decimal(12,2) NOT NULL,
	`status` enum('pending','confirmed','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`slug` varchar(256) NOT NULL,
	`description` text,
	`categoryId` int NOT NULL,
	`brand` varchar(128),
	`price` decimal(12,2) NOT NULL,
	`originalPrice` decimal(12,2),
	`discount` int DEFAULT 0,
	`imageUrl` text,
	`images` json DEFAULT ('[]'),
	`stock` int DEFAULT 0,
	`isNew` boolean DEFAULT false,
	`isFeatured` boolean DEFAULT false,
	`specs` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
