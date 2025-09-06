<?php
// File: categories/api/categories_api.php
// Path: /categories/api/categories_api.php
// Version: 1.0.0

require_once __DIR__ . '/../../config/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

global $gSqlExecutor;

try {
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    
    switch ($action) {
        case 'add':
            handleAdd();
            break;
        case 'update':
            handleUpdate();
            break;
        case 'delete':
            handleDelete();
            break;
        case 'list':
            handleList();
            break;
        default:
            throw new Exception("Unknown action: {$action}");
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'data' => null
    ]);
}

function handleAdd() {
    global $gSqlExecutor;
    
    $value = trim($_POST['value'] ?? '');
    $text = trim($_POST['text'] ?? '');
    
    if (empty($value) || empty($text)) {
        throw new Exception('Both value and text are required');
    }
    
    // Check if category already exists
    $existing = $gSqlExecutor->firstValue(
        "SELECT oc_category_id FROM oc_categories WHERE category_value = ?",
        [$value]
    );
    
    if ($existing) {
        throw new Exception('Category with this value already exists');
    }
    
    // Insert new category
    use Ocallit\Sqler\QueryBuilder;
    
    $qb = new QueryBuilder();
    $insertData = [
        'category_value' => $value,
        'category_text' => $text,
        'is_active' => 1,
        'created_at' => 'NOW()',
        'updated_at' => 'NOW()'
    ];
    
    $insert = $qb->insert('oc_categories', $insertData, true, ['created_at', 'updated_at']);
    $gSqlExecutor->query($insert['query'], $insert['parameters']);
    
    $newId = $gSqlExecutor->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'error' => null,
        'data' => [
            'id' => $newId,
            'value' => $value,
            'text' => $text
        ]
    ]);
}

function handleUpdate() {
    global $gSqlExecutor;
    
    $id = trim($_POST['id'] ?? '');
    $text = trim($_POST['text'] ?? '');
    
    if (empty($id) || empty($text)) {
        throw new Exception('ID and text are required');
    }
    
    // Check if category exists
    $existing = $gSqlExecutor->row(
        "SELECT oc_category_id, category_value FROM oc_categories WHERE category_value = ? OR oc_category_id = ?",
        [$id, $id]
    );
    
    if (!$existing) {
        throw new Exception('Category not found');
    }
    
    // Update category
    use Ocallit\Sqler\QueryBuilder;
    
    $qb = new QueryBuilder();
    $updateData = [
        'category_text' => $text,
        'updated_at' => 'NOW()'
    ];
    
    $whereConditions = [
        ['category_value', '=', $id],
        'OR',
        ['oc_category_id', '=', $id]
    ];
    
    $update = $qb->update('oc_categories', $updateData, $whereConditions, ['updated_at']);
    $gSqlExecutor->query($update['query'], $update['parameters']);
    
    echo json_encode([
        'success' => true,
        'error' => null,
        'data' => [
            'id' => $id,
            'text' => $text
        ]
    ]);
}

function handleDelete() {
    global $gSqlExecutor;
    
    $id = trim($_POST['id'] ?? '');
    
    if (empty($id)) {
        throw new Exception('ID is required');
    }
    
    // Check if category exists
    $existing = $gSqlExecutor->row(
        "SELECT oc_category_id, category_value FROM oc_categories WHERE category_value = ? OR oc_category_id = ?",
        [$id, $id]
    );
    
    if (!$existing) {
        throw new Exception('Category not found');
    }
    
    // Check if category is being used (optional validation)
    $usageCount = $gSqlExecutor->firstValue(
        "SELECT COUNT(*) FROM oc_products WHERE category_id = ?",
        [$existing['oc_category_id']]
    );
    
    if ($usageCount > 0) {
        throw new Exception('Cannot delete category: it is being used by ' . $usageCount . ' product(s)');
    }
    
    // Delete category
    $gSqlExecutor->query(
        "DELETE FROM oc_categories WHERE category_value = ? OR oc_category_id = ?",
        [$id, $id]
    );
    
    echo json_encode([
        'success' => true,
        'error' => null,
        'data' => null
    ]);
}

function handleList() {
    global $gSqlExecutor;
    
    $categories = $gSqlExecutor->array(
        "SELECT oc_category_id, category_value, category_text, is_active 
         FROM oc_categories 
         WHERE is_active = 1 
         ORDER BY category_text ASC"
    );
    
    echo json_encode([
        'success' => true,
        'error' => null,
        'data' => $categories
    ]);
}

// Example database schema:
/*
CREATE TABLE `oc_categories` (
    `oc_category_id` int(11) NOT NULL AUTO_INCREMENT,
    `category_value` varchar(50) NOT NULL,
    `category_text` varchar(255) NOT NULL,
    `is_active` tinyint(1) DEFAULT 1,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`oc_category_id`),
    UNIQUE KEY `uk_category_value` (`category_value`),
    KEY `idx_active` (`is_active`),
    KEY `idx_text` (`category_text`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample data
INSERT INTO `oc_categories` (`category_value`, `category_text`) VALUES
('electronics', 'Electronics'),
('clothing', 'Clothing'),
('books', 'Books'),
('home-garden', 'Home & Garden'),
('sports', 'Sports');
*/
?>