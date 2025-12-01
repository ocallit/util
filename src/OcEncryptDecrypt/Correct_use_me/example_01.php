<?php
declare(strict_types=1);

// ---------- Standard headers ----------
header('Content-Type: application/json; charset=utf-8');
// CORS for mobile app
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require __DIR__ . '/crypto_envelope.php';  // <-- path to the helper file

try {
    // 1) Decrypt envelope (or pass-through if plaintext)
    $req = decrypt_incoming_envelope();
    // $req: ['method','path','params','body','aes_key','t']

    // 2) Rebuild your previous $inputData semantics:
    //    - If body is JSON string, decode and let JSON override params (your current precedence)
    $jsonData = null;
    if (!is_null($req['body']) && $req['body'] !== '') {
        $jsonData = json_decode($req['body'], true);
        if ($jsonData === null && json_last_error() !== JSON_ERROR_NONE) {
            throw new RuntimeException('Invalid JSON input: ' . json_last_error_msg());
        }
    }

    // Merge with precedence to JSON (same as your old code)
    $inputData = is_array($jsonData)
        ? array_merge($req['params'] ?? [], $jsonData)
        : ($req['params'] ?? []);

    // 3) Your endpoint logic (unchanged idea)
    //    Example: you had $array = getArray($inputData);
    $array = getArray($inputData);   // <-- keep your existing function

    // 4) Encrypt the response if the request came encrypted (aes_key set),
    //    otherwise send plaintext (automatic graceful fallback).
    $out = build_encrypted_response($array, $req['aes_key'], $req['path']);
    echo $out;

} catch (Throwable $e) {
    // On any error, reply with error object.
    // If the request was encrypted, keep the channel encrypted.
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $aesKey = $req['aes_key'] ?? ''; // may be empty if failure before decrypt
    http_response_code(400);
    echo build_encrypted_response(
        ['ok' => false, 'error' => $e->getMessage()],
        $aesKey,
        $path
    );
    // (Optional) also log server-side
}
