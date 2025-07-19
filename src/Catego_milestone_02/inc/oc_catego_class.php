<?php
// File: catego/inc/oc_catego.php
// Path: catego/inc/oc_catego.php  
// Version: 1.0.1


/**
 * Simple one-level category management system
 * Manages categories by type with JSON metadata storage
 */
class oc_catego {
    
    protected $sqlExecutor;

    
    /**
     * Constructor
     * @param SqlExecutor $sqlExecutor Database executor instance
     */
    public function __construct($sqlExecutor) {
        $this->sqlExecutor = $sqlExecutor;        
    }
    
    /**
     * Ensure the oc_category table exists - only called when table not found error occurs
     */
    protected function ensureTableExists() {
        $createTableSQL = "
            CREATE TABLE IF NOT EXISTS oc_category (
                oc_category_id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                category_type VARCHAR(191) NOT NULL,
                category VARCHAR(191) NOT NULL,
                category_data JSON,
                alta_db TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unico(category_type, category),
                INDEX idx_category_type (category_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $this->sqlExecutor->query($createTableSQL);
    }
    
    /**
     * Execute query with table creation fallback
     * @param string $query SQL query
     * @param array $params Query parameters
     * @param string $method SqlExecutor method to call
     * @return mixed Query result
     */
    protected function executeWithTableCheck($query, $params, $method = 'query') {
        try {
            return $this->sqlExecutor->$method($query, $params);
        } catch (Exception $e) {
            if ($this->sqlExecutor->is_last_error_table_not_found()) {
                $this->ensureTableExists();
                return $this->sqlExecutor->$method($query, $params);
            }
            throw $e;
        }
    }
    
    /**
     * List all categories for a given category type
     * @param string $category_type The type of categories to list
     * @return array Array of category records
     * @throws Exception
     */
    public function list($category_type) {
        if (empty($category_type)) {
            throw new Exception("Falto cual categoría");
        }
        
        $query = "
            SELECT 
                oc_category_id,
                category_type,
                category,
                category_data,
                alta_db
            FROM oc_category 
            WHERE category_type = ? 
            ORDER BY category
        ";
        
        return $this->executeWithTableCheck($query, [$category_type], 'array');
    }
    
    /**
     * Insert or update a category
     * @param string $category_type The type of category
     * @param string $category The category name
     * @param int|null $oc_category_id Optional ID for update, null for insert
     * @param array $category_data Optional metadata to store as JSON
     * @return int The category ID (inserted or updated)
     * @throws Exception
     */
    public function upsert($category_type, $category, $oc_category_id = null, $category_data = []) {
        if (empty($category_type)) {
            throw new Exception("Falto cual categoría");
        }
        
        if (empty($category)) {
            throw new Exception("Falto el nombre de la categoría");
        }
        // Check for conflicting category names
        
        // Prepare category_data as JSON using SqlUtils constant
        $jsonData = empty($category_data) ? null : json_encode($category_data, SqlUtils::JSON_MYSQL_OPTIONS);
        
        
        if ($oc_category_id) {
            // Update existing category
            $query = "
                UPDATE oc_category 
                SET category_type = ?, 
                    category = ?, 
                    category_data = ?
                WHERE oc_category_id = ?
            ";
            
            $this->executeWithTableCheck($query, [$category_type, $category, $jsonData, $oc_category_id]);
            
            // Get updated record for audit trail
            $updatedRecord = $this->get($category_type, null, $oc_category_id);
            if ($updatedRecord) {
                $historian = new Historian($this->sqlExecutor, 'oc_category', ['oc_category_id']);
                $historian->register('update', ['oc_category_id' => $oc_category_id], $updatedRecord);
            }
            
            return $oc_category_id;
        } else {
            // Insert new category
            $query = "
                INSERT INTO oc_category (category_type, category, category_data) 
                VALUES (?, ?, ?)
            ";
            
            try {
                $this->executeWithTableCheck($query, [$category_type, $category, $jsonData]);
                $newId = $this->sqlExecutor->last_insert_id();
                
                // Get new record for audit trail
                $newRecord = $this->get($category_type, null, $newId);
                if ($newRecord) {
                    $historian = new Historian($this->sqlExecutor, 'oc_category', ['oc_category_id']);
                    $historian->register('insert', ['oc_category_id' => $newId], $newRecord);
                }
                
                return $newId;
            } catch (Exception $e) {
                if ($this->sqlExecutor->is_last_error_duplicate_key()) {
                    throw new Exception("Ya  existe '{$category}' en categorias de '{$category_type}'");
                }
                throw $e;
            }
        }
    }
    
    /**
     * Delete a category
     * @param string $category_type The type of category
     * @param string|null $category The category name (optional if oc_category_id provided)
     * @param int|null $oc_category_id The category ID (optional if category provided)
     * @return bool True if deleted, false if not found
     * @throws Exception
     */
    public function delete($category_type, $category = null, $oc_category_id = null) {
        if (empty($category_type)) {
            throw new Exception("Falto cual categoría");
        }
        
        if (empty($category) || empty($oc_category_id)) {
            throw new Exception("Datos incompletos");
        }
        
        // Get record for audit trail before deletion
        $recordToDelete = null;
        if ($oc_category_id) {
            $recordToDelete = $this->get($category_type, null, $oc_category_id);
        }
        
        if (!$recordToDelete) {
            return false; // Record not found
        }
        
        if ($oc_category_id) {
            // Delete by ID
            $query = "DELETE FROM oc_category WHERE category_type = ? AND oc_category_id = ?";
            $this->executeWithTableCheck($query, [$category_type, $oc_category_id]);
        } else {
            // Delete by name
            $query = "DELETE FROM oc_category WHERE category_type = ? AND category = ?";
            $this->executeWithTableCheck($query, [$category_type, $category]);
        }
        
        $deleted = $this->sqlExecutor->affected_rows() > 0;
        
        // Record deletion in audit trail
        if ($deleted && $recordToDelete) {
            $this->historian->register('delete', ['oc_category_id' => $recordToDelete['oc_category_id']], $recordToDelete);
        }
        
        return $deleted;
    }
    
    /**
     * Check if a category exists
     * @param string $category_type The type of category
     * @param string|null $category The category name (optional if oc_category_id provided)
     * @param int|null $oc_category_id The category ID (optional if category provided)
     * @return bool True if exists, false otherwise
     * @throws Exception
     */
    public function exists($category_type, $category, $oc_category_id = null) {
        if(empty($category_type)) {
            throw new Exception("Falto cual categoría");
        }
        
        if(empty($category) && empty($oc_category_id)) {
            throw new Exception("Either category name or category ID must be provided");
        }
        
        if($oc_category_id) {
            // Check by ID
            $query = "SELECT 1 FROM oc_category WHERE category_type = ? AND oc_category_id = ?";
            $result = $this->executeWithTableCheck($query, [$category_type, $oc_category_id], 'firstValue');
        } else {
            // Check by name
            $query = "SELECT 1 FROM oc_category WHERE category_type = ? AND category = ?";
            $result = $this->executeWithTableCheck($query, [$category_type, $category], 'firstValue');
        }
        
        return $result !== "";
    }
    
    /**
     * Get a single category by ID or name
     * @param string $category_type The type of category
     * @param string|null $category The category name (optional if oc_category_id provided)
     * @param int|null $oc_category_id The category ID (optional if category provided)
     * @return array|null Category record or null if not found
     * @throws Exception
     */
    public function get($category_type, $category = null, $oc_category_id = null) {
        if (empty($category_type)) {
            throw new Exception("Falto cual categoría");
        }
        
        if (empty($category) && empty($oc_category_id)) {
            throw new Exception("Either category name or category ID must be provided");
        }
        
        $query = "
            SELECT 
                oc_category_id,
                category_type,
                category,
                category_data,
                alta_db
            FROM oc_category 
            WHERE category_type = ?
        ";
        
        if ($oc_category_id) {
            $query .= " AND oc_category_id = ?";
            $params = [$category_type, $oc_category_id];
        } else {
            $query .= " AND category = ?";
            $params = [$category_type, $category];
        }
        
        $result = $this->executeWithTableCheck($query, $params, 'row');
        return empty($result) ? null : $result;
    }
    
    /**
     * Get all category types in the system
     * @return array Array of distinct category types
     */
    public function getCategoryTypes() {
        $query = "SELECT DISTINCT category_type FROM oc_category ORDER BY category_type";
        return $this->executeWithTableCheck($query, [], 'vector');
    }
    
    /**
     * Count categories by type
     * @param string $category_type The type of category
     * @return int Number of categories of this type
     */
    public function count($category_type) {
        if (empty($category_type)) {
            return 0;
        }
        
        $query = "SELECT COUNT(*) FROM oc_category WHERE category_type = ?";
        return (int) $this->executeWithTableCheck($query, [$category_type], 'firstValue');
    }
    
    /**
     * Search categories by name pattern
     * @param string $category_type The type of category
     * @param string $search_term Search term to match against category names
     * @return array Array of matching category records
     */
    public function search($category_type, $search_term) {
        if (empty($category_type) || empty($search_term)) {
            return [];
        }
        
        $query = "
            SELECT 
                oc_category_id,
                category_type,
                category,
                category_data,
                alta_db
            FROM oc_category 
            WHERE category_type = ? 
            AND category LIKE ?
            ORDER BY category
        ";
        
        $searchPattern = '%' . $search_term . '%';
        return $this->executeWithTableCheck($query, [$category_type, $searchPattern], 'array');
    }
}