-- Product catalog module tables
CREATE TABLE IF NOT EXISTS product_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) DEFAULT '',
    content TEXT,
    is_published TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_category_lang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_categoryid INT NOT NULL,
    lang VARCHAR(10) NOT NULL,
    title VARCHAR(255) DEFAULT '',
    content TEXT,
    subcontent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_product_category_lang (product_categoryid, lang),
    CONSTRAINT fk_product_category_lang_category FOREIGN KEY (product_categoryid) REFERENCES product_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_category_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_categoryid INT NOT NULL,
    image_id INT,
    ordering INT DEFAULT 0,
    is_published TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_category_images_category FOREIGN KEY (product_categoryid) REFERENCES product_categories(id) ON DELETE CASCADE
);

-- Reuse existing brands table and extend for module fields
ALTER TABLE brands
    ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS content TEXT NULL,
    ADD COLUMN IF NOT EXISTS is_published TINYINT(1) DEFAULT 1;

CREATE TABLE IF NOT EXISTS brand_lang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brandid INT NOT NULL,
    lang VARCHAR(10) NOT NULL,
    title VARCHAR(255) DEFAULT '',
    content TEXT,
    subcontent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_brand_lang (brandid, lang),
    CONSTRAINT fk_brand_lang_brand FOREIGN KEY (brandid) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS brand_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brandid INT NOT NULL,
    image_id INT,
    ordering INT DEFAULT 0,
    is_published TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_brand_images_brand FOREIGN KEY (brandid) REFERENCES brands(id) ON DELETE CASCADE
);

-- Product attribute group tables
CREATE TABLE IF NOT EXISTS attribute_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sort_order INT DEFAULT 99,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attribute_group_lang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attribute_groupid INT NOT NULL,
    lang VARCHAR(10) NOT NULL,
    name VARCHAR(255) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_attribute_group_lang (attribute_groupid, lang),
    CONSTRAINT fk_attribute_group_lang_group FOREIGN KEY (attribute_groupid) REFERENCES attribute_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attribute_defs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attribute_groupid INT NOT NULL,
    short_code VARCHAR(20) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_attribute_defs_group FOREIGN KEY (attribute_groupid) REFERENCES attribute_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attribute_def_lang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attribute_defid INT NOT NULL,
    lang VARCHAR(10) NOT NULL,
    name VARCHAR(255) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_attribute_def_lang (attribute_defid, lang),
    CONSTRAINT fk_attribute_def_lang_def FOREIGN KEY (attribute_defid) REFERENCES attribute_defs(id) ON DELETE CASCADE
);

-- Extend products for rich attribute rows and child SKU overrides
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS attr_rows_json LONGTEXT NULL,
    ADD COLUMN IF NOT EXISTS child_sku_overrides_json LONGTEXT NULL;
