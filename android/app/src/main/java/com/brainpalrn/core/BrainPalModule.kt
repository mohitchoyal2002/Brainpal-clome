package com.brainpalrn.core

import android.Manifest
import android.accessibilityservice.AccessibilityServiceInfo
import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import org.json.JSONObject
import java.time.LocalDate
import java.time.ZoneId
import java.util.concurrent.Executors

class BrainPalModule(private val context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
    private val store=MonitorStore(context)
    private val backend=BackendClient(context,store)
    private val executor=Executors.newSingleThreadExecutor()
    override fun getName()="BrainPal"
    private fun permissionState(): JSONObject {
        val am=context.getSystemService(AccessibilityManager::class.java)
        val enabled=am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK).any {
            val info=it.resolveInfo.serviceInfo
            ComponentName(info.packageName,info.name)==ComponentName(context,ReelsAccessibilityService::class.java)
        }
        val ops=context.getSystemService(AppOpsManager::class.java)
        val usage=ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,android.os.Process.myUid(),context.packageName)==AppOpsManager.MODE_ALLOWED
        val notifications=Build.VERSION.SDK_INT<33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED
        return JSONObject().put("accessibility",enabled).put("connected",ReelsAccessibilityService.instance!=null).put("usage",usage)
            .put("overlay",Settings.canDrawOverlays(context)).put("notifications",notifications)
            .put("battery",context.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(context.packageName))
            .put("android",Build.VERSION.RELEASE).put("manufacturer",Build.MANUFACTURER)
    }
    @ReactMethod fun getSnapshot(promise:Promise) {executor.execute {try {promise.resolve(store.snapshot().put("permissions",permissionState()).put("backendConnected",backend.ready()).toString())}catch(e:Exception){promise.reject("SNAPSHOT",e.message)}}}
    @ReactMethod fun updateConfig(json:String,promise:Promise) {try {store.update(JSONObject(json));context.runOnUiQueueThread {ReelsAccessibilityService.instance?.refresh()};BrainWidget.update(context);promise.resolve(true)}catch(e:Exception){promise.reject("CONFIG",e.message)}}
    private fun settings(candidates:List<Intent>) {
        var opened=false
        for(intent in candidates) {
            try {context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));opened=true;break}catch(_:Exception){}
        }
        check(opened) {"Android Settings could not be opened on this device."}
    }
    @ReactMethod fun openPermission(kind:String,promise:Promise) {context.runOnUiQueueThread {try {
        val pkg=Uri.parse("package:${context.packageName}")
        when(kind) {
            "accessibility" -> settings(listOf(Intent("android.settings.ACCESSIBILITY_DETAILS_SETTINGS").putExtra("android.intent.extra.COMPONENT_NAME",ComponentName(context,ReelsAccessibilityService::class.java).flattenToString()),Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)))
            "usage" -> settings(listOf(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS,pkg),Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS),Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,pkg)))
            "overlay" -> settings(listOf(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,pkg),Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)))
            "battery" -> settings(listOf(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,pkg)))
            "notifications" -> if(Build.VERSION.SDK_INT>=33 && context.currentActivity!=null)context.currentActivity!!.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS),41) else settings(listOf(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,context.packageName)))
            else -> settings(listOf(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,pkg)))
        };promise.resolve(true)
    }catch(e:Exception){promise.reject("SETTINGS",e.message)}}}
    @ReactMethod fun startChallenge(promise:Promise) {context.runOnUiQueueThread {context.startActivity(Intent(context,ChallengeActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));promise.resolve(true)}}
    @ReactMethod fun connectBackend(url:String,name:String,promise:Promise) {executor.execute {try{promise.resolve(backend.configure(url,name).toString())}catch(e:Exception){promise.reject("BACKEND",e.message)}}}
    @ReactMethod fun remote(operation:String,payload:String,promise:Promise) {executor.execute {try {
        val data=JSONObject(payload)
        val result=when(operation) {
            "friends"->backend.request("/api/friends",null)
            "invite"->backend.request("/api/invite",JSONObject())
            "accept"->backend.request("/api/invite/accept",JSONObject().put("code",data.getString("code")))
            "sync"->backend.request("/api/sync",store.snapshot())
            "delete"->backend.request("/api/account/delete",JSONObject())
            "disconnect"->{backend.disconnect();JSONObject().put("ok",true)}
            else->error("Unknown action")
        }
        if(operation=="delete") {backend.disconnect();store.clear()}
        promise.resolve(result.toString())
    }catch(e:Exception){promise.reject("BACKEND",e.message)}}}
    @ReactMethod fun usage(promise:Promise) {executor.execute {try {
        val start=LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
        val values=context.getSystemService(UsageStatsManager::class.java).queryAndAggregateUsageStats(start,System.currentTimeMillis())
        val out=JSONObject();MonitorStore.apps.keys.forEach { app->out.put(app,values[app]?.totalTimeInForeground ?: 0) };promise.resolve(out.toString())
    }catch(e:Exception){promise.reject("USAGE",e.message)}}}
    @ReactMethod fun clearData(promise:Promise) {store.clear();BrainWidget.update(context);promise.resolve(true)}
    @ReactMethod fun shareReceipt(weekly:Boolean,promise:Promise) {context.runOnUiQueueThread {try {ReceiptShare.share(context,store,weekly);promise.resolve(true)}catch(e:Exception){promise.reject("SHARE",e.message)}}}
    override fun invalidate() {executor.shutdownNow();store.close();super.invalidate()}
}
class BrainPalPackage: ReactPackage {
    override fun createNativeModules(context:ReactApplicationContext):List<NativeModule> = listOf(BrainPalModule(context))
    override fun createViewManagers(context:ReactApplicationContext):List<ViewManager<*,*>> = emptyList()
}
