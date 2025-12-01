package com.diso.now.tienda.util

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okio.Buffer
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import javax.crypto.SecretKey

/**
 * Intercepts every request:
 * - Wraps params/body into an encrypted envelope (A256GCM + RSA-OAEP-256) -> GET ?enc=... or POST JSON body
 * - Decrypts response (if it's an envelope) back into raw JSON for Retrofit/Gson to parse.
 */
class EnvelopeCryptoInterceptor : Interceptor {

    private val serverKey by lazy { CryptoUtil.loadServerRsaPublicKey() }
    private val keyStore = ConcurrentHashMap<String, SecretKey>() // reqId -> AES key

    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val reqId = UUID.randomUUID().toString()

        // --- Build logical payload we want to protect ---
        val method = original.method.uppercase()
        val path = original.url.encodedPath
        val queryParams = original.url.queryParameterNames.associateWith { name ->
            original.url.queryParameterValues(name).joinToString(",")
        }

        val bodyString = bodyAsString(original.body)

        // JSON "payload" = everything callers intended to send (params + body)
        val payloadJson = JSONObject().apply {
            put("m", method)
            put("p", JSONObject(queryParams))       // params
            put("b", if (bodyString.isNullOrBlank()) JSONObject.NULL else bodyString) // raw JSON/string
        }.toString()

        // --- Encrypt payload ---
        val aes = CryptoUtil.genAesKey()
        val nonce = CryptoUtil.genNonce12()
        val timestamp = System.currentTimeMillis()
        val aad = "$path|$timestamp" // simple AAD binds to path+time
        val cBytes = CryptoUtil.aesGcmEncrypt(payloadJson, aes, nonce, aad)
        val kBytes = CryptoUtil.rsaOaep256Encrypt(aes.encoded, serverKey)

        val envelope = JSONObject().apply {
            put("v", 1)
            put("alg", "A256GCM+RSAOAEP256")
            put("k", CryptoUtil.b64u(kBytes))
            put("n", CryptoUtil.b64u(nonce))
            put("c", CryptoUtil.b64u(cBytes))
            put("t", timestamp)
        }

        // Keep key for response decrypt
        keyStore[reqId] = aes

        // --- Build new encrypted request ---
        val newReq = when (method) {
            "GET" -> {
                val newUrl = original.url.newBuilder()
                    .query(null) // wipe original params
                    .addQueryParameter("v", "1")
                    .addQueryParameter("enc", envelope.toString())
                    .build()

                original.newBuilder()
                    .url(newUrl)
                    .header("X-Req-Id", reqId)
                    .build()
            }

            "POST" -> {
                val encBody = RequestBody.create(
                    "application/json; charset=utf-8".toMediaTypeOrNull(),
                    envelope.toString()
                )

                original.newBuilder()
                    .header("X-Req-Id", reqId)
                    .method("POST", encBody)
                    .build()
            }

            else -> original.newBuilder().header("X-Req-Id", reqId).build()
        }

        // --- Proceed ---
        val resp = chain.proceed(newReq)

        // --- Try to decrypt response (graceful fallback if plaintext) ---
        val reqIdEcho = resp.request.header("X-Req-Id")
        val aesKey = reqIdEcho?.let { keyStore.remove(it) }

        val respBodyStr = resp.body?.string().orEmpty()
        if (aesKey == null || respBodyStr.isBlank()) {
            // No key or empty body: rebuild original response
            return resp.newBuilder()
                .body(ResponseBody.create(resp.body?.contentType(), respBodyStr))
                .build()
        }

        val maybeJson = kotlin.runCatching { JSONObject(respBodyStr) }.getOrNull()
        val decrypted = if (maybeJson != null && maybeJson.has("c") && maybeJson.has("n")) {
            val n = CryptoUtil.b64uDecode(maybeJson.getString("n"))
            val c = CryptoUtil.b64uDecode(maybeJson.getString("c"))
            val t = maybeJson.optLong("t", 0L)
            val aadResp = "$path|$t"
            kotlin.runCatching {
                CryptoUtil.aesGcmDecrypt(c, aesKey, n, aadResp)
            }.getOrNull()
        } else null

        val finalBody = decrypted ?: respBodyStr // fallback to plaintext if not our envelope
        return resp.newBuilder()
            .body(ResponseBody.create("application/json; charset=utf-8".toMediaTypeOrNull(), finalBody))
            .build()
    }

    private fun bodyAsString(body: RequestBody?): String? {
        if (body == null) return null
        return try {
            val buffer = Buffer()
            body.writeTo(buffer)
            buffer.readUtf8()
        } catch (_: Exception) {
            null
        }
    }
}
