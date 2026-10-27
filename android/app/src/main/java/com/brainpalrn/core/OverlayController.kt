package com.brainpalrn.core

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class OverlayController(private val service: AccessibilityService, private val store: MonitorStore) {
    private val wm=service.getSystemService(WindowManager::class.java)
    private var view: View?=null
    private var kind=""
    private fun dp(x:Int)=(x*service.resources.displayMetrics.density).toInt()
    private fun background(color:String,radius:Int=24)=GradientDrawable().apply {setColor(Color.parseColor(color));cornerRadius=dp(radius).toFloat()}
    private fun text(value:String,size:Float,color:String="#20211F")=TextView(service).apply {text=value;textSize=size;setTextColor(Color.parseColor(color));gravity=Gravity.CENTER;setPadding(dp(12),dp(8),dp(12),dp(8))}
    fun bubble(count:Int) {
        if(!store.config().optBoolean("bubble")) {hide();return}
        if(kind=="bubble") {(view as? TextView)?.text="🧠 $count";return}
        hide()
        val bubble=text("🧠 $count",15f).apply {
            typeface=Typeface.DEFAULT_BOLD;background=background("#FDE7B3",28)
            contentDescription="BrainPal, $count reels today. Tap to open."
            setOnClickListener {service.startActivity(Intent(service,com.brainpalrn.MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))}
        }
        val p=WindowManager.LayoutParams(dp(86),dp(48),WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,PixelFormat.TRANSLUCENT)
        p.gravity=Gravity.TOP or Gravity.END;p.y=dp(100);p.x=dp(10)
        try {wm.addView(bubble,p);view=bubble;kind="bubble"}catch(_:Exception){hide()}
    }
    fun showBlock() {
        if(kind=="block")return
        hide()
        val layout=LinearLayout(service).apply {orientation=LinearLayout.VERTICAL;gravity=Gravity.CENTER;setPadding(dp(30),dp(36),dp(30),dp(36));background=background("#FFF8E9",0)}
        layout.addView(text("🧠",72f))
        layout.addView(text("Your thumb deserves\na little holiday.",30f).apply {typeface=Typeface.DEFAULT_BOLD})
        layout.addView(text("You have watched ${store.count()} reels today.\nTake a real-world break to earn your next ${store.config().optInt("unlockReels",10)}.",17f))
        layout.addView(Button(service).apply {text="Choose an unlock challenge";isAllCaps=false;setOnClickListener {
            service.startActivity(Intent(service,ChallengeActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            hide()
        }})
        layout.addView(Button(service).apply {text="I'm done scrolling";isAllCaps=false;setOnClickListener {service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME);hide()}})
        for(i in 0 until layout.childCount) {
            (layout.getChildAt(i) as? Button)?.let {button ->
                button.setTextColor(Color.parseColor("#20211F"));button.background=background(if(i==3)"#F29F99" else "#FDE7B3",18);button.elevation=0f
                button.layoutParams=LinearLayout.LayoutParams(-1,dp(56)).apply {topMargin=dp(12)}
            }
        }
        val p=WindowManager.LayoutParams(-1,-1,WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,PixelFormat.TRANSLUCENT)
        try {wm.addView(layout,p);view=layout;kind="block"}catch(_:Exception){hide()}
    }
    fun hide() {view?.let {try {wm.removeView(it)}catch(_:Exception){}};view=null;kind=""}
}
