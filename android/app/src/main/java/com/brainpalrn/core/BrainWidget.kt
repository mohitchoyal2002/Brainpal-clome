package com.brainpalrn.core

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.brainpalrn.R

class BrainWidget: AppWidgetProvider() {
    companion object {
        fun update(context:Context) {
            val manager=AppWidgetManager.getInstance(context)
            val ids=manager.getAppWidgetIds(ComponentName(context,BrainWidget::class.java))
            if(ids.isEmpty())return
            val store=MonitorStore(context)
            try {
                val count=store.count()
                val views=RemoteViews(context.packageName,R.layout.brain_widget)
                views.setTextViewText(R.id.widget_count,"$count reels")
                views.setTextViewText(R.id.widget_subtitle,"Today · ${store.config().optInt("dailyLimit",100)} daily limit")
                val open=PendingIntent.getActivity(context,0,Intent(context,com.brainpalrn.MainActivity::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                views.setOnClickPendingIntent(R.id.widget_root,open)
                manager.updateAppWidget(ids,views)
            }finally{store.close()}
        }
    }
    override fun onUpdate(context:Context,manager:AppWidgetManager,ids:IntArray){update(context)}
    override fun onReceive(context:Context,intent:Intent){super.onReceive(context,intent);if(intent.action==Intent.ACTION_DATE_CHANGED || intent.action==Intent.ACTION_TIME_CHANGED || intent.action==Intent.ACTION_BOOT_COMPLETED || intent.action==Intent.ACTION_MY_PACKAGE_REPLACED)update(context)}
}
