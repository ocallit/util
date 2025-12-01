<?php

header('Content-Type: application/json');

require_once 'EncryptionHelper.php';

// --- CONFIGURATION ---
// In a real application, load this securely, not from a file in the web root.
$privateKeyPath = 'private_key.pem'; 

// Check if the private key file exists
if (!file_exists($privateKeyPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: Private key not found.']);
    exit;
}

// Read the private key content
$privateKeyContent = file_get_contents($privateKeyPath);

try {
    // Get the raw POST data
    $jsonInput = file_get_contents('php://input');
    $requestData = json_decode($jsonInput, true);

    // Validate the input
    if (!isset($requestData['key']) || !isset($requestData['data'])) {
        throw new Exception("Invalid request format. Missing 'key' or 'data'.", 400);
    }

    // Initialize the helper
    $encryptionHelper = new EncryptionHelper($privateKeyContent);

    // Decrypt the request
    $decryptedPayload = $encryptionHelper->decryptRequest($requestData['key'], $requestData['data']);
    $sessionAesKey = $decryptedPayload['aesKey'];
    $decryptedJson = $decryptedPayload['plaintext'];
    
    // You can now work with the decrypted data
    $clientData = json_decode($decryptedJson, true);
    // error_log("Decrypted data: " . print_r($clientData, true)); // For debugging

    // --- YOUR BUSINESS LOGIC GOES HERE ---
    // Example: process the login, fetch data, etc.
    $username = $clientData['username'] ?? 'guest';
    $responseMessage = "Hello, " . $username . "! Your data was received successfully.";
    $responseData = [
        'status' => 'success',
        'message' => $responseMessage,
        'timestamp' => time()
    ];
    // --- END OF BUSINESS LOGIC ---

    // Encrypt the response using the same session key
    $encryptedResponse = $encryptionHelper->encryptResponse(json_encode($responseData), $sessionAesKey);
    
    // Send the encrypted response back to the client
    echo json_encode(['data' => $encryptedResponse]);

} catch (Exception $e) {
    // Set HTTP status code based on exception code, if available
    $statusCode = ($e->getCode() > 0) ? $e->getCode() : 400; // Bad Request by default
    http_response_code($statusCode);
    
    // Log the detailed error for the server admin
    error_log("Encryption API Error: " . $e->getMessage());

    // Send a generic error message to the client
    echo json_encode(['error' => 'An error occurred while processing your request.']);
}
