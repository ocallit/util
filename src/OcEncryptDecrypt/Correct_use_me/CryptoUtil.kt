package com.diso.now.tienda.util

import android.util.Base64
import java.nio.ByteBuffer
import java.security.KeyFactory
import java.security.PublicKey
import java.security.SecureRandom
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

object CryptoUtil {
    // ----- Replace with your real PEM public key (RSA 2048+). Keep only base64 DER between headers. -----
private const val SERVER_PUBKEY_BASE64_DER = """
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiAzdCrsDS72nckCo8H7Z73kgB7wOV3PPC3EnTsji/37HvqJhAB4J6NpxAzAo24EAzFjVSorArQPqayYqI0xDjak7K4yI28OnWfc5MOsqToetFtWwqw1ZcNPvpCeCsULJPIDp5W97kZiPQAzfgxBe05odSXAV70t66CDZJTj8jng7L0RPqTM364iBHjbNVmJhSbh28X/EjrewOTlsupY9zNtEXdYWFUDEOZCAuT7ZW4M3KPX3mbnbr3SAx3vK0mpwYto7TXQQeyKyW/cy/Tb2zj4iqXEIc05eL2qL+VKqgtd3Xl1VO4g7AQGBfwDce0nmWLj4HzZGdbjwF0DJe2D2swIDAQAB
"""

    private val rng = SecureRandom()

    fun loadServerRsaPublicKey(): PublicKey {
        val der = Base64.decode(SERVER_PUBKEY_BASE64_DER.trim(), Base64.DEFAULT)
        val spec = X509EncodedKeySpec(der)
        return KeyFactory.getInstance("RSA").generatePublic(spec)
    }

    fun genAesKey(): SecretKey {
        val kg = KeyGenerator.getInstance("AES")
        kg.init(256)
        return kg.generateKey()
    }

    fun genNonce12(): ByteArray {
        val n = ByteArray(12)
        rng.nextBytes(n)
        return n
    }

    fun rsaOaep256Encrypt(input: ByteArray, publicKey: PublicKey): ByteArray {
        // val cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding")
        val cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-1AndMGF1Padding")
        cipher.init(Cipher.ENCRYPT_MODE, publicKey)
        return cipher.doFinal(input)
    }

    fun aesGcmEncrypt(plaintextUtf8: String, key: SecretKey, nonce12: ByteArray, aadUtf8: String? = null): ByteArray {
        val cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(128, nonce12)
        cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, key, spec)
        if (aadUtf8 != null) cipher.updateAAD(aadUtf8.toByteArray(Charsets.UTF_8))
        return cipher.doFinal(plaintextUtf8.toByteArray(Charsets.UTF_8))
    }

    fun aesGcmDecrypt(ciphertext: ByteArray, key: SecretKey, nonce12: ByteArray, aadUtf8: String? = null): String {
        val cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(128, nonce12)
        cipher.init(javax.crypto.Cipher.DECRYPT_MODE, key, spec)
        if (aadUtf8 != null) cipher.updateAAD(aadUtf8.toByteArray(Charsets.UTF_8))
        val pt = cipher.doFinal(ciphertext)
        return String(pt, Charsets.UTF_8)
    }

    fun b64u(data: ByteArray): String =
        Base64.encodeToString(data, Base64.NO_WRAP or Base64.URL_SAFE)

    fun b64uDecode(s: String): ByteArray =
        Base64.decode(s, Base64.NO_WRAP or Base64.URL_SAFE)

    fun toSecretKey(raw: ByteArray): SecretKey = SecretKeySpec(raw, "AES")
}
