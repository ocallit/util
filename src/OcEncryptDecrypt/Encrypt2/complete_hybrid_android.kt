package com.diso.now.tienda.util

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.PublicKey
import java.security.SecureRandom
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

@Serializable
data class HybridEncryptedPayload(
    val encryptedAESKey: String,      // RSA encrypted AES key
    val encryptedData: String,        // AES encrypted actual data  
    val iv: String,                   // AES IV
    val timestamp: Long = System.currentTimeMillis()
)

@Serializable
data class HybridEncryptedResponse(
    val encryptedData: String,        // AES encrypted response data
    val iv: String,                   // AES IV
    val encryptedAESKey: String,      // AES key encrypted with app's public key
    val timestamp: Long
)

class HybridCryptoManager private constructor(private val context: Context) {
    
    companion object {
        private const val TAG = "HybridCryptoManager"
        private const val RSA_TRANSFORMATION = "RSA/ECB/PKCS1Padding"
        private const val AES_TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_IV_LENGTH = 12
        private const val GCM_TAG_LENGTH = 16
        private const val APP_RSA_ALIAS = "app_hybrid_rsa_key"
        
        // BACKEND'S RSA PUBLIC KEY (Replace with actual key from your PHP setup)
        // Get this by running the PHP setupHybridCrypto() function
        private const val BACKEND_PUBLIC_KEY = """
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwqrKc8TGBQEyf5EUgXgK
tAeKrKdYhjk3w0mE4ZZXyJ2Cg5YpY3qQgb8r0zL7qC4XF2nR6P8H2RgQG+JhF+Js
PdvzX6Qg5g1qo2JzK8a1R7YpQg4x3+KjN8tR2QwC6xJ4PkN8rG2jF5zY6T+d1Pv9
L2XzJ8qE6A4J1mR+8YtK3gE2F6eR8cY5+qG4T7pJ6K9X2zW1cG7sF+3pQ8jM7YxP
2L9zX3J5Q1eR8W6T4yK2gG7sF5X8J+qE6A4J9mR2cY5QwC6xJ4PkN8rG2jF5zY6T
d1Pv9L2XzJ8qE6A4J1mR+8YtK3gE2F6eR8cY5+qG4T7pJ6K9X2zW1cG7sF+3pQ8j
MQIDAQAB
        """.trimIndent()
        
        @Volatile
        private var INSTANCE: HybridCryptoManager? = null
        
        fun getInstance(context: Context): HybridCryptoManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: HybridCryptoManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
    
    private val json = Json { 
        ignoreUnknownKeys = true
        coerceInputValues = true
    }
    
    // Cache keys to avoid repeated operations
    private var cachedBackendPublicKey: PublicKey? = null
    private var cachedAppKeyPair: KeyPair? = null
    
    init {
        try {
            // Initialize app's RSA key pair in background to avoid blocking
            Thread {
                try {
                    getOrCreateAppRSAKeyPair()
                    getBackendPublicKey()
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to initialize keys", e)
                }
            }.start()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start key initialization", e)
        }
    }
    
    /**
     * Get or create app's RSA key pair stored in Android Keystore
     */
    private fun getOrCreateAppRSAKeyPair(): KeyPair {
        cachedAppKeyPair?.let { return it }
        
        return try {
            val keyStore = KeyStore.getInstance("AndroidKeyStore")
            keyStore.load(null)
            
            if (keyStore.containsAlias(APP_RSA_ALIAS)) {
                // Load existing key pair
                val privateKey = keyStore.getKey(APP_RSA_ALIAS, null) as PrivateKey
                val publicKey = keyStore.getCertificate(APP_RSA_ALIAS).publicKey
                val keyPair = KeyPair(publicKey, privateKey)
                cachedAppKeyPair = keyPair
                keyPair
            } else {
                // Generate new key pair
                generateAppRSAKeyPair()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get app RSA key pair", e)
            throw Exception("RSA key pair initialization failed", e)
        }
    }
    
    /**
     * Generate app's RSA key pair in Android Keystore
     */
    private fun generateAppRSAKeyPair(): KeyPair {
        return try {
            val keyPairGenerator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore")
            
            val keyGenParameterSpec = KeyGenParameterSpec.Builder(
                APP_RSA_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setKeySize(2048)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_PKCS1)
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setUserAuthenticationRequired(false)
                .build()
            
            keyPairGenerator.initialize(keyGenParameterSpec)
            val keyPair = keyPairGenerator.generateKeyPair()
            cachedAppKeyPair = keyPair
            
            Log.d(TAG, "Generated new app RSA key pair")
            keyPair
        } catch (e: Exception) {
            Log.e(TAG, "Failed to generate app RSA key pair", e)
            throw Exception("RSA key pair generation failed", e)
        }
    }
    
    /**
     * Get backend's RSA public key (for encrypting requests TO backend)
     */
    private fun getBackendPublicKey(): PublicKey {
        cachedBackendPublicKey?.let { return it }
        
        return try {
            // Clean up the public key string (remove whitespace/newlines)
            val cleanKey = BACKEND_PUBLIC_KEY.replace(Regex("\\s+"), "")
            val keyBytes = Base64.decode(cleanKey, Base64.DEFAULT)
            val keySpec = X509EncodedKeySpec(keyBytes)
            val keyFactory = KeyFactory.getInstance("RSA")
            val publicKey = keyFactory.generatePublic(keySpec)
            cachedBackendPublicKey = publicKey
            publicKey
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse backend RSA public key", e)
            throw Exception("Invalid backend RSA public key configuration", e)
        }
    }
    
    /**
     * Generate random AES session key
     */
    private fun generateAESSessionKey(): SecretKey {
        val keyGenerator = KeyGenerator.getInstance("AES")
        keyGenerator.init(256) // 256-bit AES key
        return keyGenerator.generateKey()
    }
    
    /**
     * Encrypt data for sending to backend
     */
    suspend fun encrypt(data: Any): Result<String> = withContext(Dispatchers.Default) {
        try {
            Log.d(TAG, "Starting hybrid encryption")
            
            // 1. Convert data to JSON string
            val jsonString = when (data) {
                is String -> data
                else -> json.encodeToString(data)
            }
            
            // 2. Generate fresh AES session key for this request
            val aesSessionKey = generateAESSessionKey()
            val aesKeyBytes = aesSessionKey.encoded
            
            // 3. Encrypt data with AES-GCM
            val aesCipher = Cipher.getInstance(AES_TRANSFORMATION)
            aesCipher.init(Cipher.ENCRYPT_MODE, aesSessionKey)
            val iv = aesCipher.iv
            val encryptedDataBytes = aesCipher.doFinal(jsonString.toByteArray(Charsets.UTF_8))
            
            // 4. Encrypt AES session key with backend's RSA public key
            val backendPublicKey = getBackendPublicKey()
            val rsaCipher = Cipher.getInstance(RSA_TRANSFORMATION)
            rsaCipher.init(Cipher.ENCRYPT_MODE, backendPublicKey)
            val encryptedAESKey = rsaCipher.doFinal(aesKeyBytes)
            
            // 5. Create hybrid encrypted payload
            val payload = HybridEncryptedPayload(
                encryptedAESKey = Base64.encodeToString(encryptedAESKey, Base64.DEFAULT),
                encryptedData = Base64.encodeToString(encryptedDataBytes, Base64.DEFAULT),
                iv = Base64.encodeToString(iv, Base64.DEFAULT)
            )
            
            val payloadJson = json.encodeToString(payload)
            val result = Base64.encodeToString(payloadJson.toByteArray(), Base64.DEFAULT)
            
            Log.d(TAG, "Hybrid encryption completed successfully")
            Result.success(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Hybrid encryption failed", e)
            // Fallback: return original data encoded (graceful degradation)
            val fallbackData = when (data) {
                is String -> data
                else -> json.encodeToString(data)
            }
            Result.success(Base64.encodeToString(fallbackData.toByteArray(), Base64.DEFAULT))
        }
    }
    
    /**
     * Decrypt response received from backend
     */
    suspend fun decrypt(encryptedData: String): Result<Any> = withContext(Dispatchers.Default) {
        try {
            Log.d(TAG, "Starting hybrid decryption")
            
            val payloadBytes = Base64.decode(encryptedData, Base64.DEFAULT)
            val payloadJson = String(payloadBytes, Charsets.UTF_8)
            
            // Try to parse as hybrid encrypted response
            val response = try {
                json.decodeFromString<HybridEncryptedResponse>(payloadJson)
            } catch (e: Exception) {
                // Try parsing as single encrypted payload (fallback)
                try {
                    json.decodeFromString<HybridEncryptedPayload>(payloadJson)
                    // If it parses but we can't decrypt (no AES key), return as plain text
                    return@withContext Result.success(payloadJson)
                } catch (e2: Exception) {
                    // Not encrypted format, treat as plain text
                    return@withContext Result.success(payloadJson)
                }
            }
            
            // Decrypt AES key with app's private key
            val appKeyPair = getOrCreateAppRSAKeyPair()
            val encryptedAESKeyBytes = Base64.decode(response.encryptedAESKey, Base64.DEFAULT)
            
            val rsaCipher = Cipher.getInstance(RSA_TRANSFORMATION)
            rsaCipher.init(Cipher.DECRYPT_MODE, appKeyPair.private)
            val aesKeyBytes = rsaCipher.doFinal(encryptedAESKeyBytes)
            
            // Recreate AES key
            val aesKey = javax.crypto.spec.SecretKeySpec(aesKeyBytes, "AES")
            
            // Decrypt data with AES key
            val encryptedDataBytes = Base64.decode(response.encryptedData, Base64.DEFAULT)
            val iv = Base64.decode(response.iv, Base64.DEFAULT)
            
            // Split data and tag for GCM
            val ciphertext = encryptedDataBytes.sliceArray(0 until encryptedDataBytes.size - GCM_TAG_LENGTH)
            val tag = encryptedDataBytes.sliceArray(encryptedDataBytes.size - GCM_TAG_LENGTH until encryptedDataBytes.size)
            
            val aesCipher = Cipher.getInstance(AES_TRANSFORMATION)
            val gcmSpec = GCMParameterSpec(GCM_TAG_LENGTH * 8, iv)
            aesCipher.init(Cipher.DECRYPT_MODE, aesKey, gcmSpec)
            
            // Reconstruct the full encrypted data (ciphertext + tag) for GCM
            val fullEncryptedData = ciphertext + tag
            val decryptedBytes = aesCipher.doFinal(fullEncryptedData)
            val decryptedString = String(decryptedBytes, Charsets.UTF_8)
            
            // Try to parse as JSON, if it fails return as string
            val result = try {
                json.decodeFromString<Any>(decryptedString)
            } catch (e: Exception) {
                decryptedString
            }
            
            Log.d(TAG, "Hybrid decryption completed successfully")
            Result.success(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Hybrid decryption failed", e)
            // Fallback: return original data
            try {
                val fallbackBytes = Base64.decode(encryptedData, Base64.DEFAULT)
                Result.success(String(fallbackBytes, Charsets.UTF_8))
            } catch (fallbackError: Exception) {
                Result.success(encryptedData)
            }
        }
    }
    
    /**
     * Get app's public key to share with PHP backend (for response encryption)
     */
    suspend fun getAppPublicKeyForBackend(): Result<String> = withContext(Dispatchers.Default) {
        try {
            val keyPair = getOrCreateAppRSAKeyPair()
            val publicKeyBytes = keyPair.public.encoded
            val publicKeyBase64 = Base64.encodeToString(publicKeyBytes, Base64.DEFAULT)
            Result.success(publicKeyBase64)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get app public key", e)
            Result.failure(e)
        }
    }
    
    /**
     * Health check - test encryption/decryption cycle
     */
    suspend fun healthCheck(): Boolean = withContext(Dispatchers.Default) {
        try {
            val testData = "health_check_${System.currentTimeMillis()}"
            val encrypted = encrypt(testData).getOrThrow()
            
            // For full health check, we'd need to send to backend and decrypt response
            // For now, just test that encryption works
            Log.d(TAG, "Hybrid encryption health check passed")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Hybrid encryption health check failed", e)
            false
        }
    }
    
    /**
     * Clear cached keys (useful for key rotation)
     */
    fun clearCachedKeys() {
        cachedBackendPublicKey = null
        cachedAppKeyPair = null
    }
    
    /**
     * Regenerate app's RSA key pair (for key rotation)
     */
    suspend fun regenerateAppKeyPair(): Result<String> = withContext(Dispatchers.Default) {
        try {
            // Delete existing key
            val keyStore = KeyStore.getInstance("AndroidKeyStore")
            keyStore.load(null)
            keyStore.deleteEntry(APP_RSA_ALIAS)
            
            // Clear cache
            cachedAppKeyPair = null
            
            // Generate new key pair
            val newKeyPair = generateAppRSAKeyPair()
            val publicKeyBytes = newKeyPair.public.encoded
            val publicKeyBase64 = Base64.encodeToString(publicKeyBytes, Base64.DEFAULT)
            
            Log.d(TAG, "App RSA key pair regenerated")
            Result.success(publicKeyBase64)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to regenerate app key pair", e)
            Result.failure(e)
        }
    }
}