-- Fix: GrapesJS / feature blocks may include emoji (4-byte UTF-8, e.g. U+1F680 🚀).
-- MySQL utf8mb3 / old utf8 only stores up to 3 bytes per character, which causes:
--   SQLSTATE[HY000]: 1366 Incorrect string value: '\xF0\x9F...' for column `builder_html`
--
-- Run as a user with ALTER on this table (often root):
--   mysql -u root -p cms2 < migrations/fix_documents_lang_utf8mb4.sql

ALTER TABLE `documents_lang`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
