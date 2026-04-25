CREATE TABLE `banners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`titleUz` varchar(256),
	`description` text,
	`descriptionUz` text,
	`bgColor` varchar(32) NOT NULL DEFAULT '#dc2626',
	`textColor` varchar(32) NOT NULL DEFAULT '#ffffff',
	`link` varchar(512),
	`linkText` varchar(128),
	`linkTextUz` varchar(128),
	`endsAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `banners_id` PRIMARY KEY(`id`)
);
