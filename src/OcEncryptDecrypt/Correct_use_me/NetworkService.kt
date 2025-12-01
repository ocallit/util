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
 *
 * With response handling: NetworkService.fetch(url, method, params).onSuccess { response ->
 *         // Handle success
 *     }.onFailure { error ->
 *         // Handle error
 *     }
 * Fire-and-forget: NetworkService.fetch(url, method, params, handleResponse = false)
 */
object NetworkService {
    private val cache = mutableMapOf<String, Any>()
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val client = OkHttpClient.Builder()
        // .addInterceptor(EnvelopeCryptoInterceptor())
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
    private var debounceJob: Job? = null // ADD THIS LINE

    // ADD THIS METHOD:
    fun initializeConnectivityMonitoring(context: Context) {
        connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        val networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.d("NetworkService", "Network available")
                updateConnectionWithDelay(true) // Use debounced update
            }

            override fun onLost(network: Network) {
                Log.d("NetworkService", "Network lost")
                updateConnectionWithDelay(false) // Use debounced update
            }

            override fun onCapabilitiesChanged(network: Network, networkCapabilities: NetworkCapabilities) {
                val hasInternet = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                        networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                Log.d("NetworkService", "Network capabilities changed: $hasInternet")
                updateConnectionWithDelay(hasInternet) // Use debounced update
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
        debounceJob?.cancel() // Clean up debounce job too
    }
    private fun checkCurrentConnection(): Boolean {
        val connectivityManager = this.connectivityManager ?: return true
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false

        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    // The debouncing function:
    private fun updateConnectionWithDelay(connected: Boolean) {
        debounceJob?.cancel() // Cancel previous job
        debounceJob = CoroutineScope(Dispatchers.Main).launch {
            delay(3500) // Wait 1.5 seconds before updating UI
            isConnected = connected
        }
    }

    suspend fun fetchWithCache(
        context: Context,
        url: String,
        method: String = "GET",
        params: Map<String, String> = emptyMap(),
        body: Any? = null,
        cacheKey: String? = url, // default cache key is URL
        forceRefresh: Boolean = false
    ): Result<Any> {
        val key = cacheKey ?: url

        if (!forceRefresh && cache.containsKey(key)) {
            return Result.success(cache[key]!!)
        }

        val finalParams = params.toMutableMap()
        if (url.contains("producto")) {
            val lat = SecureDataStore.readAppDataOrDefault(context, PreferenceKeys.SELECTED_ADDRESS_LAT, "")
            val lng = SecureDataStore.readAppDataOrDefault(context, PreferenceKeys.SELECTED_ADDRESS_LNG, "")
            val addressId = SecureDataStore.readAppDataOrDefault(context, PreferenceKeys.SELECTED_ADDRESS_ID, "")
            finalParams["lat"] = lat
            finalParams["lng"] = lng
            finalParams["selected_address_id"] = addressId
        }

        val result = fetch(url, method, finalParams, body)
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
            val response = when (method.uppercase()) {
                "GET" -> apiService.get(url, params)
                "POST" -> apiService.post(url, body ?: mapOf<String, String>(), params)
                else -> throw IllegalArgumentException("Unsupported method: $method")
            }

            if (!handleResponse) {
                return@withContext Result.success(Unit)
            }

            if (response.isSuccessful) {
                Result.success(response.body() ?: Unit)
            } else {
                Log.e("NetworkService", "____________________ Error fetching $url: ${response.code()} ${response.message()}")
                Result.failure(Exception("HTTP ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }





}


