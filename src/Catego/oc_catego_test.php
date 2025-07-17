<?php
// File: catego/test.php  
// Path: catego/test.php
// Version: 1.0.0

// Include config and class
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/inc/oc_catego.php';

// HTML Test Interface
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>oc_catego Backend Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .success { color: green; }
        .error { color: red; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
        button { padding: 8px 16px; margin: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>oc_catego Backend Test</h1>
    
    <div class="test-section">
        <h2>Class Tests</h2>
        <button onclick="runClassTests()">Run Class Tests</button>
        <div id="classTestResults"></div>
    </div>
    
    <div class="test-section">
        <h2>AJAX Tests</h2>
        <button onclick="runAjaxTests()">Run AJAX Tests</button>
        <div id="ajaxTestResults"></div>
    </div>
    
    <script>
        async function runClassTests() {
            const resultsDiv = document.getElementById('classTestResults');
            resultsDiv.innerHTML = '<p>Running class tests...</p>';
            
            try {
                const response = await fetch('test_runner.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'test_type=class'
                });
                
                const result = await response.text();
                resultsDiv.innerHTML = result;
            } catch (error) {
                resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            }
        }
        
        async function runAjaxTests() {
            const resultsDiv = document.getElementById('ajaxTestResults');
            resultsDiv.innerHTML = '<p>Running AJAX tests...</p>';
            
            try {
                const response = await fetch('test_runner.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'test_type=ajax'
                });
                
                const result = await response.text();
                resultsDiv.innerHTML = result;
            } catch (error) {
                resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            }
        }
    </script>
</body>
</html>

<?php
// If called directly via CLI or with test parameter, run tests
if (php_sapi_name() === 'cli' || isset($_GET['run'])) {
    echo "<h2>Direct PHP Test Results</h2>\n";
    runDirectTests();
}

function runDirectTests() {
    global $gSqlExecutor;
    
    try {
        echo "<h3>Testing oc_catego class...</h3>\n";
        
        $categoryManager = new oc_catego($gSqlExecutor);
        
        // Test 1: Insert new categories
        echo "<h4>Test 1: Insert Categories</h4>\n";
        $clientId1 = $categoryManager->upsert('Cliente', 'VIP', null, ['priority' => 'high', 'discount' => 15]);
        $clientId2 = $categoryManager->upsert('Cliente', 'Regular', null, ['priority' => 'normal', 'discount' => 5]);
        $productId1 = $categoryManager->upsert('Producto', 'Electronics', null, ['tax_rate' => 18.5, 'warranty' => '2 years']);
        
        echo "<div class='success'>✓ Created categories:</div>\n";
        echo "<ul>";
        echo "<li>Cliente/VIP (ID: {$clientId1})</li>";
        echo "<li>Cliente/Regular (ID: {$clientId2})</li>";
        echo "<li>Producto/Electronics (ID: {$productId1})</li>";
        echo "</ul>\n";
        
        // Test 2: List categories
        echo "<h4>Test 2: List Categories</h4>\n";
        $clients = $categoryManager->list('Cliente');
        $products = $categoryManager->list('Producto');
        
        echo "<strong>Cliente categories:</strong>\n";
        echo "<pre>" . print_r($clients, true) . "</pre>\n";
        
        echo "<strong>Producto categories:</strong>\n";
        echo "<pre>" . print_r($products, true) . "</pre>\n";
        
        // Test 3: Update category
        echo "<h4>Test 3: Update Category</h4>\n";
        $categoryManager->upsert('Cliente', 'VIP Premium', $clientId1, ['priority' => 'highest', 'discount' => 25, 'perks' => 'free shipping']);
        echo "<div class='success'>✓ Updated VIP category to VIP Premium</div>\n";
        
        // Test 4: Check exists
        echo "<h4>Test 4: Check Exists</h4>\n";
        $exists1 = $categoryManager->exists('Cliente', 'VIP Premium');
        $exists2 = $categoryManager->exists('Cliente', 'NonExistent');
        echo "<div class='success'>✓ VIP Premium exists: " . ($exists1 ? 'Yes' : 'No') . "</div>\n";
        echo "<div class='success'>✓ NonExistent exists: " . ($exists2 ? 'Yes' : 'No') . "</div>\n";
        
        // Test 5: Get single category
        echo "<h4>Test 5: Get Single Category</h4>\n";
        $vipCategory = $categoryManager->get('Cliente', 'VIP Premium');
        echo "<strong>VIP Premium category:</strong>\n";
        echo "<pre>" . print_r($vipCategory, true) . "</pre>\n";
        
        // Test 6: Search
        echo "<h4>Test 6: Search Categories</h4>\n";
        $searchResults = $categoryManager->search('Cliente', 'VIP');
        echo "<strong>Search results for 'VIP':</strong>\n";
        echo "<pre>" . print_r($searchResults, true) . "</pre>\n";
        
        // Test 7: Count
        echo "<h4>Test 7: Count Categories</h4>\n";
        $clientCount = $categoryManager->count('Cliente');
        $productCount = $categoryManager->count('Producto');
        echo "<div class='success'>✓ Cliente categories: {$clientCount}</div>\n";
        echo "<div class='success'>✓ Producto categories: {$productCount}</div>\n";
        
        // Test 8: Get all types
        echo "<h4>Test 8: Get All Category Types</h4>\n";
        $types = $categoryManager->getCategoryTypes();
        echo "<strong>All category types:</strong>\n";
        echo "<pre>" . print_r($types, true) . "</pre>\n";
        
        // Test 9: Delete
        echo "<h4>Test 9: Delete Category</h4>\n";
        $deleted = $categoryManager->delete('Cliente', 'Regular');
        echo "<div class='success'>✓ Deleted Regular category: " . ($deleted ? 'Success' : 'Failed') . "</div>\n";
        
        echo "<h3 class='success'>All tests completed successfully!</h3>\n";
        
    } catch (Exception $e) {
        echo "<div class='error'>Error: " . $e->getMessage() . "</div>\n";
        echo "<pre>" . $e->getTraceAsString() . "</pre>\n";
    }
}
?>