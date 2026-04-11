-- Visual builder (GrapesJS) support for CMS documents
-- Run against your `cms2` database (adjust table/column names if yours differ).

-- Which editor/template this page uses: standard (rich text) or grapesjs (visual builder)
ALTER TABLE `documents`
  ADD COLUMN `page_template` VARCHAR(32) NOT NULL DEFAULT 'standard'
  COMMENT 'standard | grapesjs'
  AFTER `footer_ordering`;

-- Large HTML per language for visual builder (avoids TEXT size limits on `content`)
ALTER TABLE `documents_lang`
  ADD COLUMN `builder_html` MEDIUMTEXT NULL
  COMMENT 'GrapesJS / visual builder HTML for this language'
  AFTER `meta_keywords`;

-- If `documents_lang` was utf8mb3 / utf8 (3-byte), emoji in builder HTML will fail on INSERT/UPDATE.
-- After adding the column, run: migrations/fix_documents_lang_utf8mb4.sql
