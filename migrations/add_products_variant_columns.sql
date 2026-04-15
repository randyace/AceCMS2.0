-- Add product variant linkage columns for child SKUs
-- Parent product -> child variant relationship in same products table.

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS parent_product_id INT NULL AFTER id,
    ADD COLUMN IF NOT EXISTS is_variant TINYINT(1) NOT NULL DEFAULT 0 AFTER parent_product_id;

ALTER TABLE products
    ADD INDEX IF NOT EXISTS idx_products_parent_product_id (parent_product_id),
    ADD INDEX IF NOT EXISTS idx_products_is_variant (is_variant),
    ADD INDEX IF NOT EXISTS idx_products_parent_variant (parent_product_id, is_variant);

-- Add FK only if it does not already exist.
SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND CONSTRAINT_NAME = 'fk_products_parent_product'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @fk_sql := IF(
    @fk_exists = 0,
    'ALTER TABLE products ADD CONSTRAINT fk_products_parent_product FOREIGN KEY (parent_product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
);

PREPARE stmt FROM @fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
