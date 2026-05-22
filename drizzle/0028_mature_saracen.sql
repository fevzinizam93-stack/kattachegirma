CREATE TABLE `youtube_cache` (
	`cacheKey` varchar(256) NOT NULL,
	`data` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `youtube_cache_cacheKey` PRIMARY KEY(`cacheKey`)
);
