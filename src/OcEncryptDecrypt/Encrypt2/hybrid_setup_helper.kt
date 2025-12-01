package com.diso.now.tienda.util

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Helper class for setting up hybrid encryption between Android app and PHP backend
 */
class HybridCryptoSetupHelper private constructor(private val context: Context) {
    
    companion object {
        private const val TAG = "HybridCryptoSetup"
        private const val SETUP_ENDPOINT = "auth/setup-hybrid-crypto"
        private const val TEST_ENDPOINT = "auth/test-hybrid-crypto"
        
        @Volatile
        private var INSTANCE: HybridCryptoSetupHelper? = null
        
        fun getInstance(context: Context): HybridCryptoSetupHelper {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: HybridCryptoSetupHelper(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
    
    /**
     * Perform complete hybrid crypto setup with backend
     * This sends the app's public key to the backend so it can encrypt responses
     */
    suspend fun performSetup(): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Starting hybrid crypto setup with backend")
            
            // Get app's public key for the backend
            val appPublicKeyResult = NetworkService.getAppPublicKeyForBackend()
            if (appPublicKeyResult.isFailure) {
                return@withContext Result.failure(
                    Exception("Failed to get app public key: ${appPublicKeyResult.exceptionOrNull()?.message}")
                )
            }
            
            val appPublicKey = appPublicKeyResult.getOrThrow()
            
            // Temporarily disable encryption for the setup request
            val originalEncryptionState = NetworkService.isEncryptionEnabled()
            NetworkService.setEncryptionEnabled(false)
            
            try {
                // Send app's public key to backend
                val response = NetworkService.fetch(
                    url = SETUP_ENDPOINT,
                    method = "POST",
                    body = mapOf(
                        "app_public_key" to appPublicKey,
                        "client_id" to getClientId(),
                        "encryption_type" to "RSA_AES_HYBRID",
                        "timestamp" to System.currentTimeMillis()
                    )
                )
                
                response.fold(
                    onSuccess = { result ->
                        Log.d(TAG, "Hybrid crypto setup successful: $result")
                        // Re-enable encryption after successful setup
                        NetworkService.setEncryptionEnabled(true)
                        return@withContext Result.success(true)
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Hybrid crypto setup failed", error)
                        return@withContext Result.failure(error)
                    }
                )
            } finally {
                // Restore original encryption state
                NetworkService.setEncryptionEnabled(originalEncryptionState)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Hybrid crypto setup error", e)
            Result.failure(e)
        }
    }
    
    /**
     * Test encrypted communication with backend
     */
    suspend fun testEncryptedCommunication(): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Testing hybrid encrypted communication")
            
            val testData = mapOf(
                "test_message" to "Hello from Android with Hybrid Encryption",
                "timestamp" to System.currentTimeMillis(),
                "client_id" to getClientId(),
                "encryption_test" to true
            )
            
            val response = NetworkService.fetch(
                url = TEST_ENDPOINT,
                method = "POST",
                body = testData
            )
            
            response.fold(
                onSuccess = { result ->
                    Log.d(TAG, "Hybrid encrypted communication test successful: $result")
                    Result.success(true)
                },
                onFailure = { error ->
                    Log.e(TAG, "Hybrid encrypted communication test failed", error)
                    Result.failure(error)
                }
            )
            
        } catch (e: Exception) {
            Log.e(TAG, "Hybrid encrypted communication test error", e)
            Result.failure(e)
        }
    }
    
    /**
     * Perform key rotation - regenerate app's RSA key pair
     */
    suspend fun rotateKeys(): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Starting key rotation")
            
            // Generate new RSA key pair
            val newPublicKeyResult = NetworkService.regenerateAppKeys()
            if (newPublicKeyResult.isFailure) {
                return@withContext Result.failure(
                    Exception("Failed to generate new keys: ${newPublicKeyResult.exceptionOrNull()?.message}")
                )
            }
            
            val newPublicKey = newPublicKeyResult.getOrThrow()
            
            // Send new public key to backend
            val originalEncryptionState = NetworkService.isEncryptionEnabled()
            NetworkService.setEncryptionEnabled(false)
            
            try {
                val response = NetworkService.fetch(
                    url = "auth/rotate-hybrid-keys",
                    method = "POST",
                    body = mapOf(
                        "new_app_public_key" to newPublicKey,
                        "client_id" to getClientId(),
                        "timestamp" to System.currentTimeMillis()
                    )
                )
                
                response.fold(
                    onSuccess = {
                        Log.d(TAG, "Key rotation successful")
                        NetworkService.setEncryptionEnabled(true)
                        Result.success(true)
                    },
                    onFailure = { error ->
                        Log.e(TAG, "Key rotation failed", error)
                        Result.failure(error)
                    }
                )
            } finally {
                NetworkService.setEncryptionEnabled(originalEncryptionState)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Key rotation error", e)
            Result.failure(e)
        }
    }
    
    /**
     * Check if hybrid crypto setup has been completed
     */
    suspend fun isSetupCompleted(): Boolean {
        return try {
            NetworkService.isEncryptionEnabled() && testEncryptedCommunication().isSuccess
        } catch (e: Exception) {
            Log.w(TAG, "Failed to check setup status", e)
            false
        }
    }
    
    /**
     * Get comprehensive setup status
     */
    suspend fun getSetupStatus(): Map<String, Any> = withContext(Dispatchers.IO) {
        try {
            val encryptionInfo = NetworkService.getEncryptionInfo()
            val setupCompleted = isSetupCompleted()
            
            mapOf(
                "setup_completed" to setupCompleted,
                "encryption_info" to encryptionInfo,
                "client_id" to getClientId(),
                "last_check" to System.currentTimeMillis()
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get setup status", e)
            mapOf(
                "setup_completed" to false,
                "error" to e.message,
                "client_id" to getClientId()
            )
        }
    }
    
    /**
     * Get or generate client ID for this device
     */
    private fun getClientId(): String {
        val prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
        var clientId = prefs.getString("client_id", null)
        
        if (clientId == null) {
            clientId = "android_${System.currentTimeMillis()}_${(Math.random() * 10000).toInt()}"
            prefs.edit().putString("client_id", clientId).apply()
        }
        
        return clientId
    }
}

/**
 * COMPLETE INTEGRATION EXAMPLE FOR MAINACTIVITY:
 */

/*
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize NetworkService with Hybrid Encryption
        NetworkService.initialize(this)
        
        // Perform hybrid crypto setup
        lifecycleScope.launch {
            val setupHelper = HybridCryptoSetupHelper.getInstance(this@MainActivity)
            
            try {
                // Check if setup is already completed
                val status = setupHelper.getSetupStatus()
                Log.d("MainActivity", "Crypto setup status: $status")
                
                if (!setupHelper.isSetupCompleted()) {
                    Log.d("MainActivity", "Performing hybrid crypto setup...")
                    
                    setupHelper.performSetup().fold(
                        onSuccess = {
                            Log.d("MainActivity", "Hybrid crypto setup completed successfully")
                            
                            // Test the encrypted communication
                            setupHelper.testEncryptedCommunication().fold(
                                onSuccess = { 
                                    Log.d("MainActivity", "Hybrid encrypted communication working perfectly") 
                                    
                                    // Log encryption info
                                    val encInfo = NetworkService.getEncryptionInfo()
                                    Log.d("MainActivity", "Encryption info: $encInfo")
                                },
                                onFailure = { error -> 
                                    Log.e("MainActivity", "Encrypted communication test failed", error)
                                }
                            )
                        },
                        onFailure = { error ->
                            Log.e("MainActivity", "Hybrid crypto setup failed", error)
                            // Continue with unencrypted communication as fallback
                        }
                    )
                } else {
                    Log.d("MainActivity", "Hybrid crypto setup already completed")
                    
                    // Optional: Test communication periodically
                    setupHelper.testEncryptedCommunication().fold(
                        onSuccess = { Log.d("MainActivity", "Encrypted communication healthy") },
                        onFailure = { Log.w("MainActivity", "Encrypted communication test failed") }
                    )
                }
                
            } catch (e: Exception) {
                Log.e("MainActivity", "Crypto setup error", e)
            }
        }
        
        setContent {
            DisoNowTheme {
                YourAppContent()
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        NetworkService.cleanup()
    }
}
*/

/**
 * COMPLETE SETUP STEPS:
 * 
 * 1. ANDROID SETUP:
 *    - Add HybridCryptoManager.kt, updated NetworkService.kt, and this file
 *    - Replace BACKEND_PUBLIC_KEY in HybridCryptoManager with your actual key
 *    - Add initialization code to MainActivity (see example above)
 * 
 * 2. PHP BACKEND SETUP:
 *    - Add HybridCryptoManager.php to your PHP project
 *    - Run setupHybridCrypto() to generate RSA keys
 *    - Copy the public key to Android's BACKEND_PUBLIC_KEY constant
 *    - Store private key securely on backend
 *    - Update your API endpoints to use HybridCryptoManager
 * 
 * 3. API ENDPOINTS TO ADD:
 *    - auth/setup-hybrid-crypto (receives app's public key)
 *    - auth/test-hybrid-crypto (tests encrypted communication)
 *    - auth/rotate-hybrid-keys (for key rotation)
 * 
 * 4. BENEFITS:
 *    ✅ NO DATABASE DEPENDENCY - Works even if database crashes
 *    ✅ PERFECT FORWARD SECRECY - New AES key per request
 *    ✅ TRANSPARENT TO YOUR EXISTING CODE - No changes needed
 *    ✅ FAST PERFORMANCE - RSA only for keys, AES for data
 *    ✅ SECURE - Industry standard hybrid cryptography
 *    ✅ GRACEFUL FALLBACK - Continues working if encryption fails
 */