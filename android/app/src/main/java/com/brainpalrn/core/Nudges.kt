package com.brainpalrn.core
import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import com.brainpalrn.R

object Nudges {
    fun milestone(context:Context,count:Int) {
        if(count==0 || count%50!=0)return
        if(Build.VERSION.SDK_INT>=33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return
        val manager=context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("brainpal_breaks","Gentle scroll breaks",NotificationManager.IMPORTANCE_DEFAULT))
        val intent=PendingIntent.getActivity(context,51,Intent(context,com.brainpalrn.MainActivity::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val message=when((count/50)%3) {0->"Your thumb is training for the Olympics. Give it a water break.";1->"$count reels. Your brain buddy would like a tiny walk.";else->"Your attention is the real currency. Time for a fresh start?"}
        manager.notify(51,Notification.Builder(context,"brainpal_breaks").setSmallIcon(R.drawable.brain_icon).setContentTitle("$count reels today. Hey, human.")
            .setContentText(message).setStyle(Notification.BigTextStyle().bigText(message)).setContentIntent(intent).setAutoCancel(true).build())
    }
}
