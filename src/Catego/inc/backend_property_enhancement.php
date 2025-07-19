<?php
// File: catego/inc/oc_catego_enhanced.php
// Path: catego/inc/oc_catego_enhanced.php  
// Version: 1.0.0

/**
 * Enhanced category management with property definitions
 * Extends the base oc_catego class with property metadata support
 */
class oc_catego_enhanced extends oc_catego {
    
    /**
     * Enhanced upsert with property definition handling
     * @param string $category_type The type of category
     * @param string $category The category name
     * @param int|null $oc_category_id Optional ID for update, null for insert
     * @param array $category_data Category data including _property_definitions
     * @return int The category ID (inserted or updated)
     * @throws Exception
     */
    public function upsert($category_type, $category, $oc_category_id = null, $category_data = []) {
        // Extract property definitions if they exist
        $property_definitions = null;
        if (isset($category_data['_property_definitions'])) {
            $property_definitions = $category_data['_property_definitions'];
            unset($category_data['_property_definitions']); // Remove from category_data
        }
        
        // Call parent upsert
        $categoryId = parent::upsert($category_type, $category, $oc_category_id, $category_data);
        
        // Store property definitions separately if provided
        if ($property_definitions !== null) {
            $this->savePropertyDefinitions($categoryId, $property_definitions);
        }
        
        return $categoryId;
    }
    
    /**
     * Enhanced get with property definitions
     * @param string $category_type The type of category
     * @param string|null $category The category name
     * @param int|null $oc_category_id The category ID
     * @return array|null Category record with property definitions
     */
    public function get($category_type, $category = null, $oc_category_id = null) {
        $result = parent::get($category_type, $category, $oc_category_id);
        
        if ($result) {
            // Add property definitions to the result
            $result['_property_definitions'] = $this->getPropertyDefinitions($result['oc_category_id']);
        }
        
        return $result;
    }
    
    /**
     * Enhanced list with property definitions
     * @param string $category_type The type of categories to list
     * @return array Array of category records with property definitions
     */
    public function list($category_type) {
        $categories = parent::list($category_type);
        
        // Add property definitions to each category
        foreach ($categories as &$category) {
            $category['_property_definitions'] = $this->getPropertyDefinitions($category['oc_category_id']);
        }
        
        return $categories;
    }
    
    /**
     * Save property definitions for a category
     * @param int $category_id The category ID
     * @param array $property_definitions Property definitions array
     */
    protected function savePropertyDefinitions($category_id, $property_definitions) {
        try {
            // Ensure property definitions table exists
            $this->ensurePropertyTableExists();
            
            // Delete existing property definitions
            $deleteQuery = "DELETE FROM oc_category_properties WHERE oc_category_id = ?";
            $this->executeWithTableCheck($deleteQuery, [$category_id]);
            
            // Insert new property definitions
            foreach ($property_definitions as $property_name => $property_config) {
                $insertQuery = "
                    INSERT INTO oc_category_properties 
                    (oc_category_id, property_name, property_type, property_label, property_config) 
                    VALUES (?, ?, ?, ?, ?)
                ";
                
                $property_type = $property_config['type'] ?? 'internal';
                $property_label = $property_config['label'] ?? $property_name;
                $property_config_json = json_encode($property_config, SqlUtils::JSON_MYSQL_OPTIONS);
                
                $this->executeWithTableCheck($insertQuery, [
                    $category_id,
                    $property_name,
                    $property_type,
                    $property_label,
                    $property_config_json
                ]);
            }
        } catch (Exception $e) {
            // Log error but don't fail the main operation
            error_log("Failed to save property definitions for category {$category_id}: " . $e->getMessage());
        }
    }
    
    /**
     * Get property definitions for a category
     * @param int $category_id The category ID
     * @return array Property definitions array
     */
    protected function getPropertyDefinitions($category_id) {
        try {
            $query = "
                SELECT property_name, property_type, property_label, property_config
                FROM oc_category_properties 
                WHERE oc_category_id = ?
                ORDER BY property_name
            ";
            
            $properties = $this->executeWithTableCheck($query, [$category_id], 'array');
            
            $definitions = [];
            foreach ($properties as $property) {
                $config = json_decode($property['property_config'], true) ?: [];
                $definitions[$property['property_name']] = [
                    'type' => $property['property_type'],
                    'label' => $property['property_label'],
                    'value' => $config['value'] ?? '',
                    'config' => $config
                ];
            }
            
            return $definitions;
            
        } catch (Exception $e) {
            // Return empty array if table doesn't exist or other error
            return [];
        }
    }
    
    /**
     * Ensure the property definitions table exists
     */
    protected function ensurePropertyTableExists() {
        $createTableSQL = "
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $this->sqlExecutor->query($createTableSQL);
    }
    
    /**
     * Enhanced delete with property definitions cleanup
     * @param string $category_type The type of category
     * @param string|null $category The category name
     * @param int|null $oc_category_id The category ID
     * @return bool True if deleted, false if not found
     */
    public function delete($category_type, $category = null, $oc_category_id = null) {
        // Get the category ID if not provided
        if (!$oc_category_id && $category) {
            $categoryRecord = $this->get($category_type, $category);
            $oc_category_id = $categoryRecord ? $categoryRecord['oc_category_id'] : null;
        }
        
        // Delete property definitions first (will be handled by CASCADE, but explicit is better)
        if ($oc_category_id) {
            try {
                $deletePropsQuery = "DELETE FROM oc_category_properties WHERE oc_category_id = ?";
                $this->executeWithTableCheck($deletePropsQuery, [$oc_category_id]);
            } catch (Exception $e) {
                // Ignore if property table doesn't exist
                if (!$this->sqlExecutor->is_last_error_table_not_found()) {
                    error_log("Failed to delete property definitions for category {$oc_category_id}: " . $e->getMessage());
                }
            }
        }
        
        // Call parent delete
        return parent::delete($category_type, $category, $oc_category_id);
    }
    
    /**
     * Get categories by property type for widget rendering
     * @param string $category_type The category type
     * @param string $property_type Property type filter ('display', 'input', 'both')
     * @return array Categories that have properties of the specified type
     */
    public function getCategoriesWithPropertyType($category_type, $property_type) {
        try {
            $query = "
                SELECT DISTINCT c.oc_category_id, c.category_type, c.category, c.category_data, c.alta_db
                FROM oc_category c
                INNER JOIN oc_category_properties p ON c.oc_category_id = p.oc_category_id
                WHERE c.category_type = ? AND p.property_type = ?
                ORDER BY c.category
            ";
            
            $categories = $this->executeWithTableCheck($query, [$category_type, $property_type], 'array');
            
            // Add property definitions
            foreach ($categories as &$category) {
                $category['_property_definitions'] = $this->getPropertyDefinitions($category['oc_category_id']);
            }
            
            return $categories;
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Get property usage statistics
     * @param string $category_type Optional category type filter
     * @return array Statistics about property usage
     */
    public function getPropertyStats($category_type = null) {
        try {
            $whereClause = $category_type ? "WHERE c.category_type = ?" : "";
            $params = $category_type ? [$category_type] : [];
            
            $query = "
                SELECT 
                    p.property_type,
                    COUNT(*) as usage_count,
                    COUNT(DISTINCT c.oc_category_id) as categories_count
                FROM oc_category_properties p
                INNER JOIN oc_category c ON p.oc_category_id = c.oc_category_id
                {$whereClause}
                GROUP BY p.property_type
                ORDER BY p.property_type
            ";
            
            return $this->executeWithTableCheck($query, $params, 'array');
            
        } catch (Exception $e) {
            return [];
        }
    }
}

/**
 * Enhanced AJAX handler with property definitions support
 * Extends the existing ajax.php functionality
 */

// Example enhanced AJAX endpoint usage:
// In your enhanced ajax.php, replace the basic oc_catego with oc_catego_enhanced

/*
// Enhanced ajax.php modifications:

// At the top after includes:
require_once __DIR__ . '/inc/oc_catego_enhanced.php';

// Replace categoryManager initialization:
$categoryManager = new oc_catego_enhanced($gSqlExecutor);

// The rest of the AJAX handlers work the same, but now support property definitions
*/

/**
 * Widget Integration Helper Functions
 */
class oc_catego_widget_integration {
    
    /**
     * Generate widget-ready category data with property fields
     * @param array $categories Categories from enhanced backend
     * @return array Widget-ready categories with property field HTML
     */
    public static function generateWidgetCategories($categories) {
        $widgetCategories = [];
        
        foreach ($categories as $category) {
            $widgetCategory = [
                'id' => (string)$category['oc_category_id'],
                'label' => $category['category'],
                'properties' => []
            ];
            
            // Process property definitions
            if (!empty($category['_property_definitions'])) {
                foreach ($category['_property_definitions'] as $propName => $propDef) {
                    if ($propDef['type'] !== 'internal') {
                        $widgetCategory['properties'][$propName] = [
                            'type' => $propDef['type'],
                            'label' => $propDef['label'],
                            'value' => $propDef['value'],
                            'html' => self::generatePropertyHTML($propName, $propDef, $category['oc_category_id'])
                        ];
                    }
                }
            }
            
            $widgetCategories[] = $widgetCategory;
        }
        
        return $widgetCategories;
    }
    
    /**
     * Generate HTML for a property field
     * @param string $propName Property name
     * @param array $propDef Property definition
     * @param int $categoryId Category ID
     * @return string HTML for the property
     */
    protected static function generatePropertyHTML($propName, $propDef, $categoryId) {
        $uniqueId = "{$propName}_{$categoryId}";
        $label = htmlspecialchars($propDef['label']);
        $value = htmlspecialchars($propDef['value']);
        
        switch ($propDef['type']) {
            case 'display':
                return "<div class='oc_catego_property oc_catego_property--display'>
                    <span class='oc_catego_property_label'>{$label}:</span>
                    <span class='oc_catego_property_value'>{$value}</span>
                </div>";
                
            case 'input':
                return "<div class='oc_catego_property oc_catego_property--input'>
                    <label class='oc_catego_property_label' for='{$uniqueId}'>{$label}:</label>
                    <input type='text' id='{$uniqueId}' name='{$propName}' 
                           class='oc_catego_property_input' value='{$value}' 
                           placeholder='Ingrese {$label}'>
                </div>";
                
            case 'both':
                return "<div class='oc_catego_property oc_catego_property--both'>
                    <div class='oc_catego_property_display'>
                        <span class='oc_catego_property_label'>{$label}:</span>
                        <span class='oc_catego_property_value'>{$value}</span>
                    </div>
                    <div class='oc_catego_property_input_container'>
                        <label class='oc_catego_property_label' for='{$uniqueId}'>Nuevo {$label}:</label>
                        <input type='text' id='{$uniqueId}' name='{$propName}' 
                               class='oc_catego_property_input' value='{$value}' 
                               placeholder='Cambiar {$label}'>
                    </div>
                </div>";
                
            default:
                return '';
        }
    }
    
    /**
     * Extract property values from POST data
     * Used when processing form submissions from widgets with property fields
     * @param array $postData POST data from form submission
     * @param array $categoryIds Array of category IDs to process
     * @return array Property values organized by category ID
     */
    public static function extractPropertyValues($postData, $categoryIds) {
        $propertyValues = [];
        
        foreach ($categoryIds as $categoryId) {
            $propertyValues[$categoryId] = [];
            
            // Look for fields that end with _{categoryId}
            foreach ($postData as $key => $value) {
                if (str_ends_with($key, "_{$categoryId}")) {
                    $propertyName = str_replace("_{$categoryId}", '', $key);
                    if (!empty(trim($value))) {
                        $propertyValues[$categoryId][$propertyName] = trim($value);
                    }
                }
            }
        }
        
        return array_filter($propertyValues); // Remove empty category arrays
    }
    
    /**
     * Validate property values against definitions
     * @param array $propertyValues Property values to validate
     * @param array $categoryDefinitions Category definitions from backend
     * @return array Validation results with errors
     */
    public static function validatePropertyValues($propertyValues, $categoryDefinitions) {
        $validationResults = [
            'valid' => true,
            'errors' => []
        ];
        
        foreach ($propertyValues as $categoryId => $properties) {
            $categoryDef = $categoryDefinitions[$categoryId] ?? null;
            if (!$categoryDef) continue;
            
            $propDefs = $categoryDef['_property_definitions'] ?? [];
            
            foreach ($properties as $propName => $propValue) {
                $propDef = $propDefs[$propName] ?? null;
                if (!$propDef) continue;
                
                // Basic validation - can be extended
                if ($propDef['type'] === 'input' && empty($propValue)) {
                    $validationResults['valid'] = false;
                    $validationResults['errors'][] = "Campo requerido: {$propDef['label']} en categoría {$categoryDef['category']}";
                }
            }
        }
        
        return $validationResults;
    }
}
?>