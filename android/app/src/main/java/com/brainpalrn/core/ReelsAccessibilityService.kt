package com.brainpalrn.core

import android.accessibilityservice.AccessibilityService
import android.app.KeyguardManager
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.Executors

class ReelsAccessibilityService : AccessibilityService() {
    companion object { @Volatile var instance: ReelsAccessibilityService? = null }
    private val handler=Handler(Looper.getMainLooper())
    private val network=Executors.newSingleThreadExecutor()
    private lateinit var store: MonitorStore
    private lateinit var backend: BackendClient
    private lateinit var overlay: OverlayController
    private val engine=DetectionEngine()
    private var lastApp=""
    private var activeSurface=false
    private var session=UUID.randomUUID().toString()
    private var tickAt=0L
    private var pending: Runnable?=null
    private var pendingDy=0
    private var pendingDx=0
    private var lastAiAt=Long.MIN_VALUE/2
    private var aiBusy=false
    private var approvedShape=""
    private var approvedUntil=0L
    private var generation=0L
    private val tick=object: Runnable {
        override fun run() {
            val now=SystemClock.elapsedRealtime()
            val unlocked=(getSystemService(POWER_SERVICE) as PowerManager).isInteractive && !(getSystemService(KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked
            val config=store.config()
            val monitoring=config.optBoolean("enabled") && config.optBoolean("consent")
            // Inspect only the foreground package while a consented video session is active.
            val foreground=if(activeSurface && monitoring && unlocked)rootInActiveWindow?.packageName?.toString() else null
            if(activeSurface && unlocked && foreground==lastApp && monitoring) {
                if(tickAt>0)store.duration(lastApp,now-tickAt)
                if(store.blocked(lastApp))overlay.showBlock() else overlay.bubble(store.count())
            } else if(activeSurface || ((!monitoring || !unlocked) && pending!=null)) { leave() }
            tickAt=now
            handler.postDelayed(this,1_000)
        }
    }
    override fun onServiceConnected() {
        instance=this; store=MonitorStore(this); backend=BackendClient(this,store); overlay=OverlayController(this,store)
        updateEventPackages()
        handler.post(tick)
    }
    private fun updateEventPackages() {
        val config=store.config()
        val allowed=if(config.optBoolean("enabled") && config.optBoolean("consent"))MonitorStore.apps.keys.filter {store.monitored(it)} else emptyList()
        // Android filters callbacks before they reach us. Never subscribe to arbitrary config packages.
        serviceInfo=serviceInfo.apply {packageNames=(allowed+packageName).distinct().toTypedArray()}
    }
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if(event==null || !::store.isInitialized)return
        val app=event.packageName?.toString().orEmpty()
        // Ignore our own overlay events; they do not change the underlying foreground.
        if(app==packageName && event.eventType!=AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED)return
        val config=store.config()
        if(!config.optBoolean("enabled") || !config.optBoolean("consent") || !store.monitored(app)) {
            if(event.eventType==AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || !config.optBoolean("enabled"))leave()
            return
        }
        if(lastApp!=app) { leave(); lastApp=app; session=UUID.randomUUID().toString() }
        val scrolling=event.eventType==AccessibilityEvent.TYPE_VIEW_SCROLLED
        val source=event.source
        val pager=ScreenEvidence.isPager(source)
        val dy=if(scrolling)event.scrollDeltaY else 0
        val dx=if(scrolling)event.scrollDeltaX else 0
        val page=if(scrolling)event.fromIndex else -1
        if(scrolling && pager) {pendingDy+=dy; pendingDx+=dx}
        // Settle bursts once. Content changes cannot cancel a pending swipe.
        if(pending!=null && !scrolling)return
        pending?.let { handler.removeCallbacks(it) }
        val work=Runnable {
            pending=null
            val y=if(scrolling)pendingDy else 0; val x=if(scrolling)pendingDx else 0
            pendingDy=0; pendingDx=0
            inspect(app,scrolling,pager,y,x,page)
        }
        pending=work; handler.postDelayed(work,if(scrolling)220 else 100)
    }
    private fun leave() {
        generation++; activeSurface=false
        engine.leave(SystemClock.elapsedRealtime())
        pending?.let {handler.removeCallbacks(it)}; pending=null; pendingDy=0; pendingDx=0
        if(::overlay.isInitialized)overlay.hide()
    }
    private fun inspect(app: String, scroll: Boolean, pager: Boolean, dy: Int, dx: Int, page: Int) {
        val root=rootInActiveWindow ?: return
        if(root.packageName?.toString()!=app)return
        val pm=getSystemService(POWER_SERVICE) as PowerManager
        if(!pm.isInteractive || (getSystemService(KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked) { leave(); return }
        val dm=resources.displayMetrics
        val screen=ScreenEvidence.read(root,dm.widthPixels,dm.heightPixels)
        val now=SystemClock.elapsedRealtime()
        val shape=app+screen.ids.sorted().joinToString("|")
        val aiApproved=approvedShape==shape && now<approvedUntil
        if(screen.known || aiApproved) {
            accept(Evidence(app,now,true,screen.blocked,scroll,pager,dy,dx,page,screen.identity,if(screen.known)"local" else "gemini"))
        } else {
            activeSurface=false; overlay.hide()
            if(!screen.candidate || screen.blocked)engine.leave(now)
        }
        val config=store.config()
        if(screen.known || !screen.candidate || screen.blocked || !config.optBoolean("aiEnabled") || !backend.ready() || aiBusy || now-lastAiAt<15_000)return
        aiBusy=true; lastAiAt=now
        val requestedGeneration=generation
        val state=screen.publicState(app,scroll && pager,dy,dx,page)
        network.execute {
            try {
                val verdict=backend.request("/api/evaluate",JSONObject().put("evidence",state))
                handler.post {
                    aiBusy=false
                    store.prefs.edit().putString("lastAi",verdict.optString("message","Gemini classification received")).apply()
                    if(requestedGeneration!=generation || lastApp!=app || rootInActiveWindow?.packageName?.toString()!=app || !store.config().optBoolean("aiEnabled") || !store.config().optBoolean("enabled"))return@post
                    val current=ScreenEvidence.read(rootInActiveWindow,dm.widthPixels,dm.heightPixels)
                    val currentShape=app+current.ids.sorted().joinToString("|")
                    // The cloud classifies a layout, not one video's caption/identity.
                    // Recheck the CURRENT surface; never replay the request's old scroll.
                    if(currentShape!=shape || current.blocked)return@post
                    if(verdict.optBoolean("surfaceAccepted",false) && verdict.optString("confidence")=="high") {
                        approvedShape=shape; approvedUntil=SystemClock.elapsedRealtime()+60_000
                        // An expired network result never replays an old swipe.
                        accept(Evidence(app,SystemClock.elapsedRealtime(),true,false,false,false,0,0,-1,current.identity,"gemini"))
                    }
                }
            } catch(error: Exception) { handler.post { aiBusy=false; store.prefs.edit().putString("lastAi",error.message?.take(180) ?: "Gemini unavailable. Local counting continues.").apply() } }
        }
    }
    private fun accept(e: Evidence) {
        val reel=engine.observe(e)
        activeSurface=!e.obstructed
        if(reel!=null) { store.record(reel,session); BrainWidget.update(this); Nudges.milestone(this,store.count()) }
        if(!activeSurface)overlay.hide() else if(store.blocked(e.app))overlay.showBlock() else overlay.bubble(store.count())
    }
    fun refresh() {
        updateEventPackages()
        val config=store.config()
        if(!config.optBoolean("enabled") || !config.optBoolean("consent") || !store.monitored(lastApp))leave()
        else if(activeSurface) { if(store.blocked(lastApp))overlay.showBlock() else overlay.bubble(store.count()) }
    }
    override fun onInterrupt() { leave() }
    override fun onDestroy() {
        instance=null; handler.removeCallbacksAndMessages(null)
        if(::overlay.isInitialized)overlay.hide()
        network.shutdownNow()
        if(::store.isInitialized)store.close()
        super.onDestroy()
    }
}
