-- GrapesJS / visual builder for news (blogs + blog_lang), mirrors documents setup.
-- Run with a user that has ALTER privileges:
--   mysql -u root -p cms2 < migrations/add_blog_grapesjs_columns.sql

ALTER TABLE `blogs`
  ADD COLUMN `page_template` VARCHAR(32) NOT NULL DEFAULT 'standard'
  COMMENT 'standard | grapesjs'
  AFTER `featured`;

ALTER TABLE `blog_lang`
  ADD COLUMN `builder_html` MEDIUMTEXT NULL
  COMMENT 'GrapesJS HTML for this language'
  AFTER `meta_description`;
