package com.brainpalrn.core

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import androidx.core.content.FileProvider
import java.io.File

object ReceiptShare {
    fun share(context:Context,store:MonitorStore,weekly:Boolean) {
        val bitmap=Bitmap.createBitmap(1080,1600,Bitmap.Config.ARGB_8888)
        val canvas=Canvas(bitmap);canvas.drawColor(Color.parseColor("#FFF9EE"))
        val ink=Color.parseColor("#20211F")
        val paint=Paint(Paint.ANTI_ALIAS_FLAG).apply {color=ink;typeface=Typeface.create("monospace",Typeface.NORMAL)}
        fun write(value:String,y:Float,size:Float=36f,center:Boolean=false) {paint.textSize=size;paint.textAlign=if(center)Paint.Align.CENTER else Paint.Align.LEFT;canvas.drawText(value,if(center)540f else 100f,y,paint)}
        write("B R A I N P A L",160f,48f,true)
        write(if(weekly)"REELS WRAPPED" else "YOUR REEL RECEIPT",250f,32f,true)
        write(if(weekly)"Your last seven days" else store.today()+" · Today's bill",320f,28f,true)
        var y=430f
        val stats=store.snapshot()
        val rows=if(weekly)stats.getJSONArray("week") else stats.getJSONArray("splits")
        var total=0
        for(i in 0 until rows.length()) {
            val row=rows.getJSONObject(i);val n=row.getInt("count");total+=n
            val label=if(weekly)row.getString("date") else row.getString("name")
            write(label,y);paint.textAlign=Paint.Align.RIGHT;canvas.drawText(n.toString(),980f,y,paint);y+=85f
        }
        paint.strokeWidth=3f;canvas.drawLine(100f,y,980f,y,paint);y+=100
        write("TOTAL",y,44f);paint.textAlign=Paint.Align.RIGHT;canvas.drawText("$total reels",980f,y,paint)
        write("NO REFUNDS.",y+160f,40f,true)
        write("Your attention is the real currency.",y+230f,24f,true)
        val dir=File(context.cacheDir,"receipts").apply {mkdirs()}
        val file=File(dir,if(weekly)"brainpal-weekly.png" else "brainpal-receipt.png")
        file.outputStream().use {bitmap.compress(Bitmap.CompressFormat.PNG,100,it)};bitmap.recycle()
        val uri=FileProvider.getUriForFile(context,context.packageName+".files",file)
        val intent=Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_STREAM,uri).putExtra(Intent.EXTRA_TEXT,if(weekly)"My BrainPal Reels Wrapped. Let's scroll a little less." else "My reels bill today. Beat it, I dare you.")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        context.startActivity(Intent.createChooser(intent,"Share your BrainPal receipt").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
