package com.brainpalrn.core

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.graphics.Color
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.nfc.NfcAdapter
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.sqrt

class ChallengeActivity : Activity(), SensorEventListener {
    private lateinit var store: MonitorStore
    private lateinit var sensors: SensorManager
    private lateinit var layout: LinearLayout
    private lateinit var status: TextView
    private val handler=Handler(Looper.getMainLooper())
    private var mode=""
    private var started=0L
    private var progress=0
    private var baseline=-1f
    private var lastJump=0L
    private var faceDownSince=0L
    private var pausedAt=0L
    private var resumed=false
    private var downSwipe=0f
    private var nfc: NfcAdapter?=null
    private val ticker=object: Runnable {
        override fun run() {
            val now=SystemClock.elapsedRealtime()
            if(mode=="detox" && resumed) {
                val seconds=((now-started)/1000).toInt()
                status.text="Hands off. Breathe.\n$seconds / 60 seconds"
                if(seconds>=60) { finishChallenge();return }
            }
            if(mode=="face" && faceDownSince>0 && resumed) {
                val seconds=((now-faceDownSince)/1000).toInt()
                status.text="Phone jail\n$seconds / 30 seconds face down"
                if(seconds>=30) { finishChallenge();return }
            }
            handler.postDelayed(this,250)
        }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store=MonitorStore(this);sensors=getSystemService(SENSOR_SERVICE) as SensorManager;nfc=NfcAdapter.getDefaultAdapter(this)
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.statusBarColor=Color.parseColor("#FFF8E9")
        showChoices()
    }
    private fun base(title:String) {
        layout=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL;gravity=Gravity.CENTER;setPadding(50,80,50,50);setBackgroundColor(Color.parseColor("#FFF8E9"))}
        layout.addView(TextView(this).apply {text="🧠\n$title";textSize=30f;gravity=Gravity.CENTER;setTextColor(Color.parseColor("#20211F"))})
        status=TextView(this).apply {textSize=18f;gravity=Gravity.CENTER;setPadding(0,32,0,32);setTextColor(Color.parseColor("#54554F"))};layout.addView(status)
        setContentView(layout)
    }
    private fun button(label:String,action:()->Unit) {
        val density=resources.displayMetrics.density
        layout.addView(Button(this).apply {
            text=label;isAllCaps=false;setTextColor(Color.parseColor("#20211F"));textSize=15f;elevation=0f
            background=android.graphics.drawable.GradientDrawable().apply {setColor(Color.parseColor("#F29F99"));cornerRadius=18*density}
            layoutParams=LinearLayout.LayoutParams(-1,(54*density).toInt()).apply {topMargin=(10*density).toInt()}
            setOnClickListener {performHapticFeedback(android.view.HapticFeedbackConstants.CONFIRM);action()}
        })
    }
    private fun showChoices() {
        stopSensors();mode="";base("Earn your next reels")
        status.text="One small action. A fresh start.\nChoose what works for you."
        button("Walk 30 steps") { choose("walk") }
        button("10 gentle jumps") { choose("jump") }
        button("Phone jail · face down for 30s") { choose("face") }
        button("Thumb detox · 60s pause") { choose("detox") }
        button("Scroll 30 times here") { choose("scroll") }
        if(nfc!=null) button("Tap an NFC card") { choose("nfc") }
        button("Back") {finish()}
    }
    private fun choose(challenge:String) {
        stopSensors();mode=challenge;progress=0;baseline=-1f;faceDownSince=0;started=SystemClock.elapsedRealtime()
        base(when(mode){"walk"->"A tiny walk";"jump"->"Move a little";"face"->"Phone jail";"detox"->"Give your thumb a break";"nfc"->"Your physical unlock key";else->"Intentional scrolling"})
        when(mode) {
            "walk" -> {
                if(checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)!=PackageManager.PERMISSION_GRANTED) {requestPermissions(arrayOf(Manifest.permission.ACTIVITY_RECOGNITION),40);return}
                val sensor=sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
                if(sensor==null)status.text="This device has no step counter. Choose another challenge." else {sensors.registerListener(this,sensor,SensorManager.SENSOR_DELAY_NORMAL);status.text="Walk at your own pace.\n0 / 30 steps"}
            }
            "jump","face" -> {
                val sensor=sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
                if(sensor==null)status.text="Motion sensor unavailable. Choose another challenge." else sensors.registerListener(this,sensor,SensorManager.SENSOR_DELAY_GAME)
                status.text=if(mode=="face")"Place the phone face down for 30 seconds.\nKeep this challenge open." else "Hold your phone securely.\n0 / 10 jumps"
            }
            "nfc" -> {status.text=if(nfc?.isEnabled==true)"Hold a physical NFC card near your phone.\nNo payment or card data is read." else "Turn on NFC in Android Settings first.";enableNfc()}
            "scroll" -> {
                status.text="Swipe up in this challenge.\n0 / 30 swipes"
                status.setOnTouchListener {v,e ->
                    when(e.actionMasked) {
                        android.view.MotionEvent.ACTION_DOWN -> {downSwipe=e.y;true}
                        android.view.MotionEvent.ACTION_UP -> {if(downSwipe-e.y>80){progress++;status.text="Intentional swipes\n$progress / 30";if(progress>=30)finishChallenge()};v.performClick();true}
                        else -> true
                    }
                }
            }
        }
        button("Choose another challenge") {showChoices()}
    }
    private fun enableNfc() {
        if(mode=="nfc" && nfc?.isEnabled==true && resumed)nfc?.enableReaderMode(this,{handler.post {if(mode=="nfc" && resumed)finishChallenge()}},NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B or NfcAdapter.FLAG_READER_NFC_F or NfcAdapter.FLAG_READER_NFC_V or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,null)
    }
    override fun onSensorChanged(event: SensorEvent) {
        if(!resumed)return
        if(mode=="walk" && event.sensor.type==Sensor.TYPE_STEP_COUNTER) {
            if(baseline<0)baseline=event.values[0]
            progress=(event.values[0]-baseline).toInt().coerceAtLeast(0)
            status.text="$progress / 30 steps";if(progress>=30)finishChallenge()
        } else if(mode=="face" && event.sensor.type==Sensor.TYPE_ACCELEROMETER) {
            if(event.values[2] < -8.0f) {if(faceDownSince==0L)faceDownSince=SystemClock.elapsedRealtime()} else {faceDownSince=0;status.text="Place the phone face down for 30 seconds."}
        } else if(mode=="jump" && event.sensor.type==Sensor.TYPE_ACCELEROMETER) {
            val a=sqrt(event.values.sumOf { (it*it).toDouble() })
            val now=SystemClock.elapsedRealtime()
            if(a>19 && now-lastJump>850) {lastJump=now;progress++;status.text="$progress / 10 jumps";if(progress>=10)finishChallenge()}
        }
    }
    override fun onAccuracyChanged(sensor: Sensor?, accuracy:Int)=Unit
    private fun finishChallenge() {store.unlock();BrainWidget.update(this);ReelsAccessibilityService.instance?.refresh();mode="";finish()}
    private fun stopSensors() {sensors.unregisterListener(this);try {nfc?.disableReaderMode(this)}catch(_:Exception){}}
    override fun onResume() {super.onResume();resumed=true;started=SystemClock.elapsedRealtime();faceDownSince=0;if(mode.isNotEmpty() && mode!="detox" && mode!="scroll" && mode!="nfc")choose(mode);enableNfc();handler.post(ticker)}
    override fun onPause() {resumed=false;handler.removeCallbacks(ticker);if(::sensors.isInitialized)stopSensors();faceDownSince=0;super.onPause()}
    override fun onRequestPermissionsResult(requestCode:Int,permissions:Array<out String>,grantResults:IntArray) {super.onRequestPermissionsResult(requestCode,permissions,grantResults);if(requestCode==40){if(grantResults.firstOrNull()==PackageManager.PERMISSION_GRANTED)choose("walk") else {status.text="Step permission was not granted. You can choose any other challenge.";button("Choose another challenge"){showChoices()}}}}
    override fun onDestroy(){handler.removeCallbacksAndMessages(null);if(::sensors.isInitialized)stopSensors();if(::store.isInitialized)store.close();super.onDestroy()}
}
