package com.brainpalrn.core

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.brainpalrn.BuildConfig
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class BackendClient(private val context: Context, private val store: MonitorStore) {
    private fun key(): SecretKey {
        val ks=KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey("brainpal_device_token",null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder("brainpal_device_token",KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    private fun token(): String? = try {
        store.prefs.getString("token",null)?.let {
            val parts=it.split(":"); val cipher=Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)))
            String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)))
        }
    } catch (_: Exception) { null }
    private fun saveToken(token: String) {
        val cipher=Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE,key())
        store.prefs.edit().putString("token",Base64.encodeToString(cipher.iv,Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(token.toByteArray()),Base64.NO_WRAP)).apply()
    }
    fun configure(url: String, name: String): JSONObject {
        val uri=URI(url.trim().trimEnd('/'))
        require(uri.host!=null && uri.userInfo==null && uri.query==null && uri.fragment==null && uri.path.orEmpty().isEmpty()) { "Use your backend origin, for example https://your-project.vercel.app" }
        require(uri.scheme=="https" || (BuildConfig.DEBUG && uri.scheme=="http" && uri.host in listOf("10.0.2.2","localhost","127.0.0.1"))) { "An HTTPS backend URL is required." }
        val origin=uri.toString()
        if(store.prefs.getString("backendUrl","")!=origin)store.prefs.edit().remove("token").apply()
        store.prefs.edit().putString("backendUrl",origin).apply()
        if(token()==null) {
            val result=request("/api/register",JSONObject().put("name",name.take(40)),false)
            saveToken(result.getString("deviceToken"))
            store.prefs.edit().putString("userId",result.getString("id")).apply()
        }
        return request("/api/me",null)
    }
    fun ready(): Boolean = store.prefs.getString("backendUrl","")!!.isNotEmpty() && token()!=null
    fun request(path: String, body: JSONObject?, auth: Boolean = true): JSONObject {
        val origin=store.prefs.getString("backendUrl","").orEmpty()
        require(origin.isNotEmpty()) { "Connect your backend in Settings first." }
        val connection=java.net.URL(origin+path).openConnection() as HttpURLConnection
        connection.connectTimeout=4_000; connection.readTimeout=28_000
        connection.instanceFollowRedirects=false
        connection.requestMethod=if(body==null)"GET" else "POST"
        connection.setRequestProperty("Content-Type","application/json")
        if(auth)connection.setRequestProperty("Authorization","Bearer "+(token() ?: error("Reconnect the backend in Settings.")))
        try {
            if(body!=null) {connection.doOutput=true; connection.outputStream.use { it.write(body.toString().toByteArray()) }}
            val code=connection.responseCode
            val stream=if(code in 200..299)connection.inputStream else connection.errorStream
            val raw=stream?.bufferedReader()?.use { it.readText().take(65_536) }.orEmpty()
            val result=try { JSONObject(raw) } catch(_:Exception) { JSONObject() }
            if(code !in 200..299) error(result.optString("error","Backend unavailable ($code). Local detection continues."))
            return result
        } finally { connection.disconnect() }
    }
    fun disconnect() { store.prefs.edit().remove("token").remove("userId").remove("backendUrl").apply(); store.update(JSONObject().put("aiEnabled",false)) }
}
