CREATE TABLE `telegram_recipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatId` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegram_recipients_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_recipients_chatId_unique` UNIQUE(`chatId`)
);
