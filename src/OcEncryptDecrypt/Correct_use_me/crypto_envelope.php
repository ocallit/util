 <?php
declare(strict_types=1);

/**
 * Crypto helpers for our hybrid envelope:
 * Request (from client):
 *   {"v":1,"alg":"A256GCM+RSAOAEP","k":b64u(RSAOAEP(aesKey)),"n":b64u(nonce12),"c":b64u(ciphertext||tag16),"t":epoch_ms}
 * Response (from server):
 *   {"v":1,"n":b64u(nonce12),"c":b64u(ciphertext||tag16),"t":epoch_ms}
 *
 * AES: AES-256-GCM, 12-byte nonce, 16-byte tag (appended to ciphertext).
 * RSA: RSA-OAEP (SHA-1) using your server's private key (PEM).
 *
 * AAD used on both sides:  path + "|" + t
 */

////////////////////////
// CONFIG
////////////////////////

// Absolute path to your PEM-encoded RSA PRIVATE KEY
const SERVER_PRIVATE_KEY_PEM_FILE = __DIR__ . '/private/server-private.pem';
// If your key is encrypted, set the passphrase; otherwise leave as ''
const SERVER_PRIVATE_KEY_PASSPHRASE = '';

////////////////////////
// Base64url helpers
////////////////////////
function b64u_encode(string $bin): string {
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}
function b64u_decode(string $b64u): string {
    $b64 = strtr($b64u, '-_', '+/');
    $b64 .= str_repeat('=', (4 - strlen($b64) % 4) % 4);
    return base64_decode($b64, true) ?: '';
}

////////////////////////
// Key load
////////////////////////
function load_server_private_key(): OpenSSLAsymmetricKey {
    $pem = file_get_contents(SERVER_PRIVATE_KEY_PEM_FILE);
    if ($pem === false) {
        http_response_code(500);
        die('Server key missing');
    }
    $key = openssl_pkey_get_private($pem, SERVER_PRIVATE_KEY_PASSPHRASE);
    if ($key === false) {
        http_response_code(500);
        die('Invalid server private key');
    }
    return $key;
}

////////////////////////
// AES-GCM helpers
////////////////////////
/**
 * @return array{ciphertag:string, nonce:string, t:int}
 */
function aes_gcm_encrypt_json(array|string $payload, string $rawAesKey, string $aad): array {
    $plaintext = is_array($payload) ? json_encode($payload, JSON_UNESCAPED_SLASHES) : (string)$payload;
    if ($plaintext === false) {
        throw new RuntimeException('JSON encode error');
    }
    $nonce = random_bytes(12); // 96-bit nonce
    $tag   = '';
    $cipher = openssl_encrypt(
        $plaintext,
        'aes-256-gcm',
        $rawAesKey,
        OPENSSL_RAW_DATA,
        $nonce,
        $tag,
        $aad,
        16 // tag length
    );
    if ($cipher === false || strlen($tag) !== 16) {
        throw new RuntimeException('AES-GCM encrypt failed');
    }
    return [
        'ciphertag' => $cipher . $tag,
        'nonce'     => $nonce,
        't'         => (int) (microtime(true) * 1000),
    ];
}

/**
 * @param string $ciphertag ciphertext||tag16
 * @param string $rawAesKey 32 bytes
 * @param string $nonce 12 bytes
 * @param string $aad
 * @return string plaintext JSON string
 */
function aes_gcm_decrypt_ciphertag(string $ciphertag, string $rawAesKey, string $nonce, string $aad): string {
    if (strlen($ciphertag) < 17) {
        throw new RuntimeException('Bad ciphertag length');
    }
    $tag     = substr($ciphertag, -16);
    $cipher  = substr($ciphertag, 0, -16);
    $plain = openssl_decrypt(
        $cipher,
        'aes-256-gcm',
        $rawAesKey,
        OPENSSL_RAW_DATA,
        $nonce,
        $tag,
        $aad
    );
    if ($plain === false) {
        throw new RuntimeException('AES-GCM decrypt failed');
    }
    return $plain;
}

////////////////////////
// RSA-OAEP decrypt (SHA-1)
////////////////////////
/**
 * @return string raw 32-byte AES key
 */
function rsa_oaep_decrypt_aes_key(string $b64uCipherKey, OpenSSLAsymmetricKey $priv): string {
    $encKey = b64u_decode($b64uCipherKey);
    $out = '';
    $ok = openssl_private_decrypt($encKey, $out, $priv, OPENSSL_PKCS1_OAEP_PADDING);
    if (!$ok) {
        throw new RuntimeException('RSA-OAEP decrypt failed');
    }
    if (strlen($out) !== 32) {
        // Android side must send a 256-bit AES key
        throw new RuntimeException('Unexpected AES key length');
    }
    return $out;
}

////////////////////////
// Envelope parsing / building
////////////////////////

/**
 * Reads the request, detects envelope (GET ?enc=... or POST body JSON),
 * decrypts it and returns the logical request parts + AES key.
 *
 * @return array{
 *   method:string,
 *   path:string,
 *   params:array<string,string>,
 *   body:string|null,
 *   aes_key:string,
 *   t:int
 * }
 */
function decrypt_incoming_envelope(): array {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    $envelopeJson = null;

    if ($method === 'GET') {
        // GET: envelope is a JSON string in ?enc=...
        if (isset($_GET['enc'])) {
            $envelopeJson = $_GET['enc'];
        }
    } else {
        // POST (or others): envelope JSON is in the body
        $raw = file_get_contents('php://input') ?: '';
        if ($raw !== '') {
            $envelopeJson = $raw;
        }
    }

    if ($envelopeJson === null) {
        // No envelope: treat as plaintext pass-through
        return [
            'method' => $method,
            'path'   => $path,
            'params' => $_GET,                   // as-is
            'body'   => file_get_contents('php://input') ?: null,
            'aes_key'=> '',                      // empty when plaintext
            't'      => (int) (microtime(true) * 1000),
        ];
    }

    // Parse envelope
    $env = json_decode($envelopeJson, true);
    if (!is_array($env) || !isset($env['k'], $env['n'], $env['c'], $env['t'])) {
        http_response_code(400);
        die('Bad envelope');
    }

    $priv = load_server_private_key();
    $aesKey = rsa_oaep_decrypt_aes_key((string)$env['k'], $priv);

    $nonce = b64u_decode((string)$env['n']);
    $ciphertag = b64u_decode((string)$env['c']);
    $t = (int)$env['t'];
    $aad = $path . '|' . $t;

    $plaintext = aes_gcm_decrypt_ciphertag($ciphertag, $aesKey, $nonce, $aad);
    $payload = json_decode($plaintext, true);
    if (!is_array($payload) || !isset($payload['m'], $payload['p'])) {
        http_response_code(400);
        die('Bad payload');
    }

    return [
        'method' => strtoupper((string)$payload['m']),
        'path'   => $path,
        'params' => is_array($payload['p']) ? $payload['p'] : [],
        'body'   => array_key_exists('b', $payload) && $payload['b'] !== null ? (string)$payload['b'] : null,
        'aes_key'=> $aesKey,
        't'      => $t,
    ];
}

/**
 * Builds an encrypted response JSON string using the caller-provided AES key.
 * If $aesKey is empty, returns the plaintext as-is (graceful fallback).
 *
 * @param array|string $responseData JSON-serializable array or a raw JSON string
 * @param string $aesKey 32 bytes (raw). If empty, plaintext is returned.
 * @param string $path   Request path to bind in AAD
 * @return string JSON
 */
function build_encrypted_response(array|string $responseData, string $aesKey, string $path): string {
    if ($aesKey === '') {
        // plaintext fallback
        return is_array($responseData)
            ? json_encode($responseData, JSON_UNESCAPED_SLASHES)
            : (string)$responseData;
    }
    $aad = $path . '|' . (int) (microtime(true) * 1000);
    $enc = aes_gcm_encrypt_json($responseData, $aesKey, $aad);
    return json_encode([
        'v' => 1,
        'n' => b64u_encode($enc['nonce']),
        'c' => b64u_encode($enc['ciphertag']),
        't' => $enc['t'],
    ], JSON_UNESCAPED_SLASHES);
}
