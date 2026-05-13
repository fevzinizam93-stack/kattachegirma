CREATE TABLE `quick_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int,
	`productName` varchar(512) NOT NULL,
	`productPrice` varchar(64),
	`customerName` varchar(128) NOT NULL,
	`customerPhone` varchar(64) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quick_orders_id` PRIMARY KEY(`id`)
);
