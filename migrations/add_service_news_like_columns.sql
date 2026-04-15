-- Add missing columns so services can behave like news/blogs in CMS.
-- Run with:
--   mysql -u root -p cms2 < migrations/add_service_news_like_columns.sql

SET @has_featured := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'services'
    AND COLUMN_NAME = 'featured'
);
SET @sql_featured := IF(
  @has_featured = 0,
  "ALTER TABLE `services` ADD COLUMN `featured` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_published`",
  "SELECT 'services.featured already exists' AS message"
);
PREPARE stmt_featured FROM @sql_featured;
EXECUTE stmt_featured;
DEALLOCATE PREPARE stmt_featured;

SET @has_page_template := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'services'
    AND COLUMN_NAME = 'page_template'
);
SET @sql_page_template := IF(
  @has_page_template = 0,
  "ALTER TABLE `services` ADD COLUMN `page_template` VARCHAR(32) NOT NULL DEFAULT 'standard' COMMENT 'standard | grapesjs' AFTER `featured`",
  "SELECT 'services.page_template already exists' AS message"
);
PREPARE stmt_page_template FROM @sql_page_template;
EXECUTE stmt_page_template;
DEALLOCATE PREPARE stmt_page_template;
