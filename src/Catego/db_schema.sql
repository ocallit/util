
CREATE TABLE IF NOT EXISTS oc_category (
    oc_category_id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    category_type VARCHAR(191) NOT NULL COMMENT 'ie: categories for: clients, products, colors',
    category VARCHAR(191) NOT NULL COMMENT 'the name of the category to show the user',
    category_data JSON COMMENT 'oc_category_properties and their values and settings. if a key is not in oc_category_properties assume it is internal',
    alta_db TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unico(category_type, category),
    INDEX idx_category_type (category_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

CREATE TABLE IF NOT EXISTS oc_category_properties (
    oc_category_property_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    oc_category_id MEDIUMINT UNSIGNED NOT NULL,
    property_name VARCHAR(191) NOT NULL,
    property_type ENUM('internal', 'display', 'input', 'both') DEFAULT 'internal',
    property_label VARCHAR(191) NOT NULL,
    property_config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (oc_category_id) REFERENCES oc_category(oc_category_id) ON DELETE CASCADE,
    UNIQUE KEY unique_property (oc_category_id, property_name),
    INDEX idx_category_property_type (oc_category_id, property_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
