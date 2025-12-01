package com.diso.now.tienda.util

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.QueryMap
import retrofit2.http.Url
import java.util.concurrent.TimeUnit

interface ApiService {
    @GET
    suspend fun get(
        @Url url: String,
        @QueryMap params: Map<String, String> = emptyMap()
    ): Response<Any>

    @POST
    suspend fun post(
        @Url url: String,
        @Body body: Any,
        @QueryMap params: Map<String, String> = emptyMap()
    ): Response<Any>
}

/**
 * NetworkService with Hybrid RSA+AES Encryption
 * 
 * FEATURES:
 * ✅ Database crash resistant (no key storage needed in backend DB)
 * ✅ Perfect Forward Secrecy (new AES key per request)
 * ✅ Fast performance (RSA only for small keys, AES for bulk data)
 * ✅ Transparent to existing code (no changes needed in your repositories)
 * ✅ Graceful fallback if encryption fails
 * 
 * Usage remains exactly the same:
 * NetworkService.fetch(url, method, params).onSuccess { response ->
 *     // Handle success - response is automatically decrypted
 * }.onFailure { error ->
 *     // Handle error
 * }
 */
object NetworkService {
    private val cache = mutableMapOf<String, Any>()
    private var hybridCrypto: HybridCryptoManager? = null
    private var encryptionEnabled = true
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl("https://disonow.com.mx/api/")
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private val apiService = retrofit.create(ApiService::class.java)

    var isConnected by mutableStateOf(true)
        private set

    private var connectivityManager: ConnectivityManager? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var debounceJob: Job? = null

    /**
     * Initialize NetworkService with Hybrid Encryption support
     * Call this in your MainActivity onCreate()
     */
    fun initialize(context: Context) {
        try {
            hybridCrypto = HybridCryptoManager.getInstance(context)
            initializeConnectivityMonitoring(context)
            
            Log.d("NetworkService", "Initialized with Hybrid RSA+AES encryption")
            
            // Test encryption health in background
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val isHealthy = hybridCrypto?.healthCheck() ?: false
                    if (!isHealthy) {
                        Log.w("NetworkService", "Hybrid encryption health check failed, continuing without encryption")
                        encryptionEnabled = false
                    } else {
                        Log.d("NetworkService", "Hybrid encryption health check passed")
                    }
                } catch (e: Exception) {
                    Log.w("NetworkService", "Hybrid encryption health check error, disabling encryption", e)
                    encryptionEnabled = false
                }
            }
        } catch (e: Exception) {
            Log.e("NetworkService", "Failed to initialize hybrid encryption, continuing without it", e)
            encryptionEnabled = false
            initializeConnectivityMonitoring(context)
        }
    }

    fun initializeConnectivityMonitoring(context: Context) {
        connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        val networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.d("NetworkService", "Network available")
                updateConnectionWithDelay(true)
            }

            override fun onLost(network: Network) {
                Log.d("NetworkService", "Network lost")
                updateConnectionWithDelay(false)
            }

            override fun onCapabilitiesChanged(network: Network, networkCapabilities: NetworkCapabilities) {
                val hasInternet = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                        networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                Log.d("NetworkService", "Network capabilities changed: $hasInternet")
                updateConnectionWithDelay(hasInternet)
            }
        }

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        connectivityManager?.registerNetworkCallback(request, networkCallback)
        this.networkCallback = networkCallback

        // Set initial state
        isConnected = checkCurrentConnection()
    }
    
    fun cleanup() {
        networkCallback?.let { callback ->
            connectivityManager?.unregisterNetworkCallback(callback)
        }
        debounceJob?.cancel()
    }
    
    private fun checkCurrentConnection(): Boolean {
        val connectivityManager = this.connectivityManager ?: return true
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false

        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun updateConnectionWithDelay(connected: Boolean) {
        debounceJob?.cancel()
        debounceJob = CoroutineScope(Dispatchers.Main).launch {
            delay(3500)
            isConnected = connected
        }
    }

    /**
     * Encrypt request body using hybrid encryption
     */
    private suspend fun encryptRequestBody(body: Any?): Any? {
        if (!encryptionEnabled || hybridCrypto == null || body == null) {
            return body
        }
        
        return try {
            Log.d("NetworkService", "Encrypting request body with hybrid encryption")
            val encrypted = hybridCrypto.encrypt(body).getOrThrow()
            mapOf("encrypted_payload" to encrypted)
        } catch (e: Exception) {
            Log.w("NetworkService", "Failed to encrypt request body with hybrid encryption, sending plain", e)
            body
        }
    }

    /**
     * Decrypt response if it's encrypted
     */
    private suspend fun decryptResponse(response: Any?): Any? {
        if (!encryptionEnabled || hybridCrypto == null || response == null) {
            return response
        }

        return try {
            // Check if response is a Map with encrypted_payload key
            if (response is Map<*, *> && response.containsKey("encrypted_payload")) {
                val encryptedPayload = response["encrypted_payload"] as? String
                if (encryptedPayload != null) {
                    Log.d("NetworkService", "Decrypting response with hybrid encryption")
                    return hybridCrypto.decrypt(encryptedPayload).getOrThrow()
                }
            }
            
            // If not encrypted format, return as is
            response
        } catch (e: Exception) {
            Log.w("NetworkService", "Failed to decrypt response with hybrid encryption, returning as is", e)
            response
        }
    }

    suspend fun fetchWithCache(
        url: String,
        method: String = "GET",
        params: Map<String, String> = emptyMap(),
        body: Any? = null,
        cacheKey: String? = url,
        forceRefresh: Boolean = false
    ): Result<Any> {
        val key = cacheKey ?: url

        if (!forceRefresh && cache.containsKey(key)) {
            return Result.success(cache[key]!!)
        }

        val result = fetch(url, method, params, body)
        result.getOrNull()?.let {
            cache[key] = it
        }

        return result
    }

    fun clearCache(key: String? = null) {
        if (key == null) {
            cache.clear()
        } else {
            cache.remove(key)
        }
    }

    suspend fun fetch(
        url: String,
        method: String = "GET",
        params: Map<String, String> = emptyMap(),
        body: Any? = null,
        handleResponse: Boolean = true
    ): Result<Any> = withContext(Dispatchers.IO) {
        try {
            Log.d("NetworkService", "___________________________________ Fetching $url with method $method")
            
            // Encrypt request body transparently using hybrid encryption
            val processedBody = encryptRequestBody(body)
            
            val response = when (method.uppercase()) {
                "GET" -> apiService.get(url, params)
                "POST" -> apiService.post(url, processedBody ?: mapOf<String, String>(), params)
                else -> throw IllegalArgumentException("Unsupported method: $method")
            }

            if (!handleResponse) {
                return@withContext Result.success(Unit)
            }

            if (response.isSuccessful) {
                // Decrypt response transparently using hybrid encryption
                val rawResponse = response.body() ?: Unit
                val decryptedResponse = decryptResponse(rawResponse)
                Result.success(decryptedResponse)
            } else {
                Log.e("NetworkService", "____________________ Error fetching $url: ${response.code()} ${response.message()}")
                Result.failure(Exception("HTTP ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e("NetworkService", "Request failed", e)
            Result.failure(e)
        }
    }
    
    /**
     * Get app's public key to share with PHP backend (for response encryption)
     */
    suspend fun getAppPublicKeyForBackend(): Result<String> {
        return hybridCrypto?.getAppPublicKeyForBackend() 
            ?: Result.failure(Exception("Hybrid encryption not initialized"))
    }
    
    /**
     * Enable or disable encryption
     */
    fun setEncryptionEnabled(enabled: Boolean) {
        encryptionEnabled = enabled
        Log.d("NetworkService", "Hybrid encryption ${if (enabled) "enabled" else "disabled"}")
    }
    
    /**
     * Check if encryption is enabled and working
     */
    fun isEncryptionEnabled(): Boolean = encryptionEnabled && hybridCrypto != null
    
    /**
     * Regenerate app's RSA key pair (for key rotation)
     */
    suspend fun regenerateAppKeys(): Result<String> {
        return hybridCrypto?.regenerateAppKeyPair()
            ?: Result.failure(Exception("Hybrid encryption not initialized"))
    }
    
    /**
     * Get encryption status information
     */
    fun getEncryptionInfo(): Map<String, Any> {
        return mapOf(
            "encryption_enabled" to encryptionEnabled,
            "crypto_manager_initialized" to (hybridCrypto != null),
            "encryption_type" to "RSA+AES Hybrid"
        )
    }
}