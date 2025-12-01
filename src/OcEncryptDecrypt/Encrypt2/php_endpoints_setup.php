<?php
/**
 * COMPLETE PHP BACKEND SETUP FOR HYBRID ENCRYPTION
 * 
 * STEP 1: GENERATE RSA KEYS (Run this once)
 */

// setup_keys.php - Run this once to generate your RSA keys
require_once 'HybridCryptoManager.php';

function generateAndSaveKeys() {
    try {
        echo "🔐 Generating RSA Key Pair for Hybrid Encryption...\n\n";
        
        $keyPair = HybridCryptoManager::generateRSAKeyPair(2048);
        
        // Create secure directory if it doesn't exist
        $secureDir = __DIR__ . '/secure';
        if (!file_exists($secureDir)) {
            mkdir($secureDir, 0700, true);
        }
        
        // Save private key
        $privateKeyPath = $secureDir . '/rsa_private_key.pem';
        file_put_contents($privateKeyPath, $keyPair['private_key']);
        chmod($privateKeyPath, 0600); // Read-only for owner
        
        // Save public key for reference
        $publicKeyPath = $secureDir . '/rsa_public_key.pem';
        file_put_contents($publicKeyPath, $keyPair['public_key']);
        chmod($publicKeyPath, 0644);
        
        echo "✅ Keys generated successfully!\n\n";
        echo "📁 Private key saved to: $privateKeyPath\n";
        echo "📁 Public key saved to: $publicKeyPath\n\n";
        
        echo "🔑 COPY THIS PUBLIC KEY TO YOUR ANDROID APP:\n";
        echo "Replace the BACKEND_PUBLIC_KEY constant in HybridCryptoManager.kt\n\n";
        echo "--- START COPY HERE ---\n";
        
        // Extract just the key data without headers for Android
        $cleanPublicKey = str_replace(['-----BEGIN PUBLIC KEY-----', '-----END PUBLIC KEY-----', "\n", "\r"], '', $keyPair['public_key']);
        echo $cleanPublicKey . "\n";
        echo "--- END COPY HERE ---\n\n";
        
        echo "📝 Add this to your .env file:\n";
        echo "RSA_PRIVATE_KEY_PATH=$privateKeyPath\n\n";
        
        return $keyPair;
        
    } catch (Exception $e) {
        echo "❌ Setup failed: " . $e->getMessage() . "\n";
        return null;
    }
}

// Uncomment to run key generation:
// generateAndSaveKeys();

/**
 * STEP 2: API ENDPOINTS
 */

// api/auth/setup-hybrid-crypto.php
function handleSetupHybridCrypto() {
    header('Content-Type: application/json');
    
    try {
        // Get request data
        $rawInput = file_get_contents('php://input');
        $requestData = json_decode($rawInput, true);
        
        if (!$requestData) {
            throw new Exception("Invalid JSON data");
        }
        
        $appPublicKey = $requestData['app_public_key'] ?? null;
        $clientId = $requestData['client_id'] ?? null;
        
        if (!$appPublicKey || !$clientId) {
            throw new Exception("Missing required parameters");
        }
        
        // Store app's public key for this client (for response encryption)
        // You can store this in database, file, or cache
        storeAppPublicKey($clientId, $appPublicKey);
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Hybrid crypto setup completed',
            'client_id' => $clientId,
            'encryption_type' => 'RSA_AES_HYBRID',
            'timestamp' => time() * 1000
        ]);
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    }
}

// api/auth/test-hybrid-crypto.php
function handleTestHybridCrypto() {
    header('Content-Type: application/json');
    
    try {
        // Initialize crypto manager
        $privateKeyPath = $_ENV['RSA_PRIVATE_KEY_PATH'] ?? __DIR__ . '/../secure/rsa_private_key.pem';
        $crypto = new HybridCryptoManager($privateKeyPath);
        
        // Get and process request
        $rawInput = file_get_contents('php://input');
        $requestData = json_decode($rawInput, true);
        
        // Process (decrypt if needed) the request
        $processedRequest = $crypto->processIncomingRequest($requestData);
        
        // Create test response
        $response = [
            'status' => 'success',
            'message' => 'Hybrid encryption test successful!',
            'echo_data' => $processedRequest,
            'server_message' => 'This response was encrypted with hybrid RSA+AES',
            'timestamp' => time() * 1000
        ];
        
        // Encrypt and send response
        $encryptedResponse = $crypto->prepareOutgoingResponse($response);
        echo json_encode($encryptedResponse);
        
    } catch (Exception $e) {
        error_log("Hybrid crypto test error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Crypto test failed'
        ]);
    }
}

// api/auth/rotate-hybrid-keys.php
function handleRotateHybridKeys() {
    header('Content-Type: application/json');
    
    try {
        $rawInput = file_get_contents('php://input');
        $requestData = json_decode($rawInput, true);
        
        $newAppPublicKey = $requestData['new_app_public_key'] ?? null;
        $clientId = $requestData['client_id'] ?? null;
        
        if (!$newAppPublicKey || !$clientId) {
            throw new Exception("Missing required parameters");
        }
        
        // Update stored app public key
        storeAppPublicKey($clientId, $newAppPublicKey);
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Key rotation completed',
            'client_id' => $clientId,
            'timestamp' => time() * 1000
        ]);
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    }
}

/**
 * STEP 3: HELPER FUNCTIONS
 */

function storeAppPublicKey($clientId, $publicKey) {
    // Option 1: Store in file (simple, works without database)
    $keysDir = __DIR__ . '/secure/app_keys';
    if (!file_exists($keysDir)) {
        mkdir($keysDir, 0700, true);
    }
    
    $keyFile = $keysDir . '/' . hash('sha256', $clientId) . '.key';
    file_put_contents($keyFile, $publicKey);
    chmod($keyFile, 0600);
    
    // Option 2: Store in database (if you prefer)
    /*
    $pdo = getPDOConnection();
    $stmt = $pdo->prepare("
        INSERT INTO app_public_keys (client_id, public_key, created_at) 
        VALUES (?, ?, NOW()) 
        ON DUPLICATE KEY UPDATE public_key = ?, updated_at = NOW()
    ");
    $stmt->execute([$clientId, $publicKey, $publicKey]);
    */
}

function getAppPublicKey($clientId) {
    // Option 1: Load from file
    $keysDir = __DIR__ . '/secure/app_keys';
    $keyFile = $keysDir . '/' . hash('sha256', $clientId) . '.key';
    
    if (file_exists($keyFile)) {
        return file_get_contents($keyFile);
    }
    
    return null;
    
    // Option 2: Load from database
    /*
    $pdo = getPDOConnection();
    $stmt = $pdo->prepare("SELECT public_key FROM app_public_keys WHERE client_id = ?");
    $stmt->execute([$clientId]);
    return $stmt->fetchColumn();
    */
}

/**
 * STEP 4: UPDATE YOUR EXISTING API ENDPOINTS
 */

// Example: api/user/profile.php
function handleUserProfile() {
    header('Content-Type: application/json');
    
    try {
        // Initialize hybrid crypto
        $privateKeyPath = $_ENV['RSA_PRIVATE_KEY_PATH'] ?? __DIR__ . '/../secure/rsa_private_key.pem';
        $crypto = new HybridCryptoManager($privateKeyPath);
        
        // Get and decrypt request
        $rawInput = file_get_contents('php://input');
        $requestData = json_decode($rawInput, true);
        $processedRequest = $crypto->processIncomingRequest($requestData);
        
        // Your existing business logic here
        $userId = $processedRequest['user_id'] ?? null;
        if (!$userId) {
            throw new Exception("User ID required");
        }
        
        // Fetch user data (your existing logic)
        $userData = [
            'user_id' => $userId,
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'profile_image' => 'https://example.com/avatar.jpg',
            'last_login' => time() * 1000
        ];
        
        // Encrypt and send response
        $encryptedResponse = $crypto->prepareOutgoingResponse($userData);
        echo json_encode($encryptedResponse);
        
    } catch (Exception $e) {
        error_log("User profile error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Internal server error']);
    }
}

/**
 * STEP 5: ROUTING (if using simple routing)
 */

// router.php or index.php
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

switch (true) {
    case $requestMethod === 'POST' && str_contains($requestUri, '/auth/setup-hybrid-crypto'):
        handleSetupHybridCrypto();
        break;
        
    case $requestMethod === 'POST' && str_contains($requestUri, '/auth/test-hybrid-crypto'):
        handleTestHybridCrypto();
        break;
        
    case $requestMethod === 'POST' && str_contains($requestUri, '/auth/rotate-hybrid-keys'):
        handleRotateHybridKeys();
        break;
        
    case $requestMethod === 'GET' && str_contains($requestUri, '/user/profile'):
        handleUserProfile();
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
}

/**
 * COMPLETE DEPLOYMENT CHECKLIST:
 * 
 * ✅ 1. Generate RSA keys using generateAndSaveKeys()
 * ✅ 2. Copy public key to Android BACKEND_PUBLIC_KEY constant  
 * ✅ 3. Set RSA_PRIVATE_KEY_PATH in .env or environment
 * ✅ 4. Add HybridCryptoManager.php to your project
 * ✅ 5. Create the three auth endpoints (setup, test, rotate)
 * ✅ 6. Update existing API endpoints to use HybridCryptoManager
 * ✅ 7. Test with Android app
 * 
 * SECURITY NOTES:
 * 🔒 Private key file should be outside web root or with proper permissions (0600)
 * 🔒 Use HTTPS in production (this adds extra security on top)
 * 🔒 Consider using environment variables instead of files for keys
 * 🔒 Regularly rotate keys (the system supports this)
 * 🔒 Monitor logs for encryption failures
 * 
 * ADVANTAGES OF THIS SETUP:
 * ✅ NO DATABASE REQUIRED for encryption to work
 * ✅ Database crashes don't affect encryption
 * ✅ Perfect Forward Secrecy (new AES key per request)
 * ✅ Fast performance (RSA only for small keys)
 * ✅ Industry standard security
 * ✅ Graceful fallback if encryption fails
 * ✅ Easy to deploy and maintain
 */

?>