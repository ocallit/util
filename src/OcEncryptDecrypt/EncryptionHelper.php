<?php

/**
 * A helper class for handling encryption and decryption for client-server communication.
 * This implementation matches the hybrid approach used by the Android client.
 * 1. RSA is used to decrypt the AES session key.
 * 2. AES/GCM is used to decrypt/encrypt the actual request/response data.
 */
class EncryptionHelper
{
    // --- AES Configuration ---
    private const AES_ALGORITHM = 'aes-256-gcm';
    private const GCM_IV_LENGTH = 12; // in bytes
    private const GCM_TAG_LENGTH = 16; // in bytes

    private $privateKey;

    /**
     * Constructor
     * @param string $privateKeyContent The raw content of the server's private_key.pem file.
     */
    public function __construct(string $privateKeyContent)
    {
        $this->privateKey = openssl_pkey_get_private($privateKeyContent);
        if ($this->privateKey === false) {
            throw new Exception("Failed to parse private key. Error: " . openssl_error_string());
        }
    }

    /**
     * Decrypts an AES session key that was encrypted with the server's public RSA key.
     * @param string $wrappedAesKeyBase64 The Base64 encoded, RSA-encrypted AES key.
     * @return string The raw binary AES key.
     * @throws Exception If decryption fails.
     */
    private function unwrapAesKey(string $wrappedAesKeyBase64): string
    {
        $encryptedKey = base64_decode($wrappedAesKeyBase64);
        $decryptedKey = '';

        if (!openssl_private_decrypt($encryptedKey, $decryptedKey, $this->privateKey, OPENSSL_PKCS1_PADDING)) {
            throw new Exception("Failed to decrypt AES key. Error: " . openssl_error_string());
        }
        return $decryptedKey;
    }

    /**
     * Decrypts a data payload using AES/GCM.
     * Assumes the format [IV + Ciphertext + AuthTag].
     * @param string $encryptedDataBase64 The Base64 encoded encrypted data.
     * @param string $aesKey The raw binary AES key.
     * @return string The decrypted plaintext.
     * @throws Exception If decryption fails.
     */
    private function aesDecrypt(string $encryptedDataBase64, string $aesKey): string
    {
        $encryptedData = base64_decode($encryptedDataBase64);

        // Extract IV, Ciphertext, and Authentication Tag from the payload
        $iv = substr($encryptedData, 0, self::GCM_IV_LENGTH);
        $tag = substr($encryptedData, -self::GCM_TAG_LENGTH);
        $ciphertext = substr($encryptedData, self::GCM_IV_LENGTH, -self::GCM_TAG_LENGTH);

        $decrypted = openssl_decrypt(
            $ciphertext,
            self::AES_ALGORITHM,
            $aesKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($decrypted === false) {
            throw new Exception("Failed to decrypt data payload. Error: " . openssl_error_string());
        }
        return $decrypted;
    }

    /**
     * Processes an entire encrypted request payload (key and data).
     * @param string $wrappedKeyBase64 The encrypted AES key from the request.
     * @param string $encryptedDataBase64 The encrypted data from the request.
     * @return array ['aesKey' => string, 'plaintext' => string]
     * @throws Exception
     */
    public function decryptRequest(string $wrappedKeyBase64, string $encryptedDataBase64): array
    {
        // First, decrypt the AES session key
        $aesKey = $this->unwrapAesKey($wrappedKeyBase64);

        // Then, use the AES key to decrypt the main data payload
        $plaintext = $this->aesDecrypt($encryptedDataBase64, $aesKey);

        return [
            'aesKey' => $aesKey,
            'plaintext' => $plaintext
        ];
    }

    /**
     * Encrypts a response payload using AES/GCM with the provided session key.
     * @param string $plaintext The plaintext data to encrypt.
     * @param string $aesKey The raw binary AES key from the decrypted request.
     * @return string The Base64 encoded encrypted response data in the format [IV + Ciphertext + AuthTag].
     * @throws Exception
     */
    public function encryptResponse(string $plaintext, string $aesKey): string
    {
        // Generate a new, random Initialization Vector (IV) for the response
        $iv = openssl_random_pseudo_bytes(self::GCM_IV_LENGTH);
        $tag = ''; // This will be populated by openssl_encrypt

        $ciphertext = openssl_encrypt(
            $plaintext,
            self::AES_ALGORITHM,
            $aesKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            '', // AAD
            self::GCM_TAG_LENGTH
        );
        
        if ($ciphertext === false) {
            throw new Exception("Failed to encrypt response. Error: " . openssl_error_string());
        }

        // Combine IV, ciphertext, and tag, then Base64 encode
        return base64_encode($iv . $ciphertext . $tag);
    }
}

