CREATE TABLE `indexing_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engine` enum('google','yandex') NOT NULL,
	`type` enum('products','categories','single_url','auto') NOT NULL,
	`urlCount` int NOT NULL DEFAULT 0,
	`succeeded` int NOT NULL DEFAULT 0,
	`failed` int NOT NULL DEFAULT 0,
	`status` enum('success','partial','error') NOT NULL,
	`note` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `indexing_log_id` PRIMARY KEY(`id`)
);
