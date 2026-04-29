CREATE TABLE `utm_visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`utmSource` varchar(128),
	`utmMedium` varchar(128),
	`utmCampaign` varchar(128),
	`utmContent` varchar(128),
	`utmTerm` varchar(128),
	`landingPage` varchar(512),
	`referrer` varchar(512),
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `utm_visits_id` PRIMARY KEY(`id`)
);
