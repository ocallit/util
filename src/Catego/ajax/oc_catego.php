<?php
// File: catego/ajax.php
// Path: catego/ajax.php
// Version: 1.0.0

// Include config and database setup
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/inc/oc_catego.php';

// Set JSON response header
header('Content-Type: application/json');

try {
    // Initialize the category manager with global SQL executor
    $categoryManager = new oc_catego($gSqlExecutor);
    
    // Get the action from POST or GET
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('No action specified');
    }
    
    switch ($action) {
        case 'list':
            handleList($categoryManager);
            break;
            
        case 'get':
            handleGet($categoryManager);
            break;
            
        case 'upsert':
        case 'save':
            handleUpsert($categoryManager);
            break;
            
        case 'delete':
            handleDelete($categoryManager);
            break;
            
        case 'exists':
            handleExists($categoryManager);
            break;
            
        case 'search':
            handleSearch($categoryManager);
            break;
            
        case 'types':
            handleGetTypes($categoryManager);
            break;
            
        case 'count':
            handleCount($categoryManager);
            break;
            
        default:
            throw new Exception("Unknown action: {$action}");
    }
    
} catch (Exception $e) {
    // Return error response
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'data' => null
    ]);
}

/**
 * Handle list categories request
 * Expected POST: category_type
 * Returns: Array of categories
 */
function handleList($categoryManager) {
    $category_type = $_POST['category_type'] ?? $_GET['category_type'] ?? '';
    
    if (empty($category_type)) {
        throw new Exception('category_type is required');
    }
    
    $categories = $categoryManager->list($category_type);
    
    // Parse JSON data for each category
    foreach ($categories as &$category) {
        if (!empty($category['category_data'])) {
            $category['category_data'] = json_decode($category['category_data'], true);
        } else {
            $category['category_data'] = [];
        }
    }
    
    echo json_encode([
        'success' => true,
        'error' => null,
        'data' => $categories
    ]);
}

/**
 * Handle get single category request
 * Expected POST: category_type, (category OR oc_category_id)
 * Returns: Single category object
 */
function handleGet($categoryManager) {
    $category_type = $_POST['category_type'] ?? $_GET['category_type'] ?? '';
    $category = $_POST['category'] ?? $_GET['category'] ?? null;
    $oc_category_id = $_POST['oc_category_id'] ?? $_GET['oc_category_id'] ?? null;
    
    if (empty($category_type)) {
        throw new Exception('category_type is required');
    }
    
    if (empty($category) && empty($oc_category_id)) {
        throw new Exception('Either category or oc_category_id is required');
    }
    
    $categoryData = $categoryManager->get($category_type, $category, $oc_category_id);
    
    if ($categoryData && !empty($categoryData['category_data'])) {
        $categoryData['category_data'] = json_decode($categoryData['category_data'], true);
    } elseif ($categoryData) {
        $categoryData['category_data'] = [];
    }
    
    echo json_encode([
        'success' => true,
        'error' => null,
        'data' => $categoryData
    ]);
}

/**
 * Handle upsert (insert/update) category request
 * Expected POST: category_type, category, [oc_category_id], [additional fields as category_data]
 * Returns: Category ID
 */
function handleUpsert($categoryManager) {
    $category_type = $_POST['category_type'] ?? '';
    $category = $_POST['category'] ?? '';
    $oc_category_id = $_POST['oc_category_id'] ?? null;
    
    if (empty($category_type)) {
        throw new Exception('category_type is required');
    }
    
    if (empty($category)) {
        throw new Exception('category is required');
    }
    
    // Cast oc_category_id to int if provided
    if ($oc_category_id !== null) {
        $oc_category_id = (int) $oc_category_id;
        if ($oc_category_id <= 0) {
            $oc_category_id = null;
        }
    }
    
    // Collect additional data for category_data JSON field
    $reserved_fields = ['action', 'category_type', 'category', 'oc_category_id'];
    $category_data = [];
    
    foreach ($_POST as $key => $value) {
        if (!in_array($key, $reserved_fields) && !empty($value)) {
            $category_data[$key] = $value;
        }
    }
    
    $categoryId = $categoryManager->upsert($category_type, $category, $oc_category_id, $category_data);
    
    echo json_encode([
        'success' => true,
        'error' => null,
        'data' => [
            'oc_category_id' => $categoryId,
            'category_type' => $category_type,
            'category' => $category,
            'category_data' => $category_data
        ]
    ]);
}

/**
 * Handle delete category request
 * Expected POST: category_type, (category OR oc_category_id)
 * Returns: Boolean success
 */
function handleDelete($categoryManager) {
    $category_type = $_POST['category_type'] ?? '';
    $category = $_POST['category'] ?? null;
    $oc_category_id = $_POST['oc_category_id'] ?? null;
    
    if (empty($category_type)) {
        throw new Exception('category_type is required');
    }
    
    if (empty($category) && empty($oc_category_id)) {
        throw new Exception('Either category or oc_category_id is required');
    }
    
    // Cast oc_category_id to int if provided
    if ($oc_category_id !== null) {
        $oc_category_id = (int) $oc_category_id;
        if ($oc_category_id <= 0) {
            $oc_category_id = null;
        }
    }
    
    $deleted = $categoryManager->delete($category_type, $category, $oc_category_id);
    
    if (!$deleted) {
        throw new Exception('Category not found or could not be deleted');
    }
    
    echo json_encode([
        'success' => true,
        'error' => null,
        'data' => [
            'deleted' => true,
            'category_type' => $category_type,
            'category' => $category,
            'oc_category_id' => $oc_category_id
        ]
    ]);
}

/**
 * Handle exists check request
 * Expected POST: category_type, (category OR oc_category_id)
 * Returns: Boolean exists
 */
function handleExists($categoryManager) {
    $category_type = $_POST['category_type'] ?? $_GET['category_type'] ?? '';
    $category = $_POST['category'] ?? $_GET['category'] ?? null;
    $oc_category_id = $_POST['oc_category_id'] ?? $_GET['oc_category_id'] ?? null;
    
    if (empty($category_type)) {
        throw new Exception('category_type is required');
    }
    
    if (empty($category) && empty($oc_category_id)) {
        throw new Exception('Either category or oc_category_id is required');
    }
    
    // Cast oc_category_id to int if provided
    if ($oc_category_id !== null) {
        $oc_category_id = (int) $oc_category_id;
        if ($oc_category_id <= 0) {
            $oc_category_id = null;
        }
    }
    
    $exists = $categoryManager->exists($category_type, $category, $oc_category_id);
    
    echo json_encode([
        'success' => true,
        'error' => null,
        'data' => [
            'exists' => $exists,
            'category_type' => $category_type,
            'category' => $category,
            'oc_category_id' => $oc_category_id
        ]
    ]);
}

/**
 * Handle search categories request
 * Expected POST: category_type, search_term
 * Returns: Array of matching categories
 */
function handleSearch($categoryManager) {
    $category_type = $_POST['category_type'] ?? $_GET['category_type'] ?? '';
    $search_term = $_POST['search_term'] ?? $_GET['search_term'] ?? '';
    
    if (empty($category_type)) {
        throw new Exception('category_type is required');
    }
    
    if (empty($search_term)) {
        throw new Exception('search_term is required');
    }
    
    $categories = $categoryManager->search($category_type, $search_term);
    
    // Parse JSON data for each category
    foreach ($categories as &$category) {
        if (!empty($category['category_data'])) {
            $category['category_data'] = json_decode($category['category_data'], true);
        } else {
            $category['category_data'] = [];
        }
    }
    
    echo json_encode([
        'success' => true,
        'error' => null,
        'data' => $categories
    ]);
}

/**
 * Handle get category types request
 * Expected POST: none
 * Returns: Array of category types
 */
function handleGetTypes($categoryManager) {
    $types = $categoryManager->getCategoryTypes();
    
    echo json_encode([
        'success' => true,
        'error' => null,
        'data' => $types
    ]);
}

/**
 * Handle count categories request
 * Expected POST: category_type
 * Returns: Integer count
 */
function handleCount($categoryManager) {
    $category_type = $_POST['category_type'] ?? $_GET['category_type'] ?? '';
    
    if (empty($category_type)) {
        throw new Exception('category_type is required');
    }
    
    $count = $categoryManager->count($category_type);
    
    echo json_encode([
        'success' => true,
        'error' => null,
        'data' => [
            'count' => $count,
            'category_type' => $category_type
        ]
    ]);
}
?>