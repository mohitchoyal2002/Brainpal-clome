package com.brainpalrn.core

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

class MonitorStore(context: Context) : SQLiteOpenHelper(context.applicationContext, "brainpal.db", null, 1) {
    val prefs = context.getSharedPreferences("brainpal_settings", Context.MODE_PRIVATE)
    companion object {
        val apps = linkedMapOf("com.instagram.android" to "Instagram", "com.google.android.youtube" to "YouTube", "com.zhiliaoapp.musically" to "TikTok", "com.ss.android.ugc.trill" to "TikTok Lite", "com.snapchat.android" to "Snapchat", "com.facebook.katana" to "Facebook")
    }
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE reels(id TEXT PRIMARY KEY, app TEXT NOT NULL, at INTEGER NOT NULL, day TEXT NOT NULL, hour INTEGER NOT NULL, source TEXT NOT NULL, session TEXT NOT NULL)")
        db.execSQL("CREATE INDEX reels_day ON reels(day,app)")
        db.execSQL("CREATE TABLE duration(day TEXT NOT NULL, app TEXT NOT NULL, millis INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,app))")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit
    @Synchronized fun config(): JSONObject = JSONObject(prefs.getString("config", null) ?: "{}").apply {
        if (!has("enabled")) put("enabled", false)
        if (!has("blockEnabled")) put("blockEnabled", true)
        if (!has("dailyLimit")) put("dailyLimit", 100)
        if (!has("unlockReels")) put("unlockReels", 10)
        if (!has("cooldownMinutes")) put("cooldownMinutes", 15)
        if (!has("bubble")) put("bubble", true)
        if (!has("aiEnabled")) put("aiEnabled", false)
        if (!has("aiConsentVersion")) put("aiConsentVersion", 0)
        // An upgrade must not silently reuse consent for the previous AI provider.
        if (optInt("aiConsentVersion",0) < 2) put("aiEnabled",false)
        if (!has("consent")) put("consent", false)
        if (!has("monitoredApps")) put("monitoredApps", JSONArray(apps.keys.toList()))
        if (!has("limits")) put("limits", JSONObject())
        if (!has("onboarded")) put("onboarded", false)
    }
    @Synchronized fun update(values: JSONObject): JSONObject {
        val c = config()
        values.keys().forEach { k -> c.put(k, values.get(k)) }
        c.put("dailyLimit", c.optInt("dailyLimit", 100).coerceIn(1, 5000))
        c.put("unlockReels", c.optInt("unlockReels", 10).coerceIn(1, 100))
        c.put("cooldownMinutes", c.optInt("cooldownMinutes", 15).coerceIn(1, 120))
        prefs.edit().putString("config", c.toString()).apply()
        return c
    }
    fun monitored(app: String): Boolean = config().optJSONArray("monitoredApps")?.let { a -> (0 until a.length()).any { a.optString(it) == app } } == true
    fun today(): String = LocalDate.now().toString()
    fun count(app: String? = null, day: String = today()): Int {
        val where = if (app == null) "day=?" else "day=? AND app=?"
        val args = if (app == null) arrayOf(day) else arrayOf(day,app)
        return readableDatabase.rawQuery("SELECT COUNT(*) FROM reels WHERE $where", args).use { it.moveToFirst(); it.getInt(0) }
    }
    @Synchronized fun record(reel: CountedReel, session: String) {
        val now = java.time.ZonedDateTime.now()
        writableDatabase.execSQL("INSERT INTO reels VALUES(?,?,?,?,?,?,?)", arrayOf(UUID.randomUUID().toString(),reel.app,System.currentTimeMillis(),now.toLocalDate().toString(),now.hour,reel.source,session))
        // Keep enough history for wrapped, without an unbounded event database.
        writableDatabase.delete("reels", "day < ?", arrayOf(LocalDate.now().minusDays(90).toString()))
        writableDatabase.delete("duration", "day < ?", arrayOf(LocalDate.now().minusDays(90).toString()))
    }
    @Synchronized fun duration(app: String, millis: Long) {
        val d=today()
        writableDatabase.execSQL("INSERT OR IGNORE INTO duration(day,app,millis) VALUES(?,?,0)",arrayOf(d,app))
        writableDatabase.execSQL("UPDATE duration SET millis=millis+? WHERE day=? AND app=?",arrayOf(millis.coerceIn(0,5_000),d,app))
    }
    fun blocked(app: String): Boolean {
        val c=config()
        if (!c.optBoolean("enabled") || !c.optBoolean("blockEnabled")) return false
        val total=count()
        val allowanceValid = prefs.getLong("allowanceExpiry",0)>System.currentTimeMillis() && total < prefs.getInt("allowanceUntilCount",0)
        if (allowanceValid) return false
        val appLimit=c.optJSONObject("limits")?.optInt(app,0) ?: 0
        return total>=c.optInt("dailyLimit",100) || (appLimit>0 && count(app)>=appLimit)
    }
    @Synchronized fun unlock() {
        val c=config()
        prefs.edit().putInt("allowanceUntilCount",count()+c.optInt("unlockReels",10))
            .putLong("allowanceExpiry",System.currentTimeMillis()+c.optInt("cooldownMinutes",15)*60_000L).apply()
    }
    fun snapshot(): JSONObject {
        val day=today()
        val splits=JSONArray()
        apps.forEach { (app,name) ->
            val ms=readableDatabase.rawQuery("SELECT millis FROM duration WHERE day=? AND app=?",arrayOf(day,app)).use { if(it.moveToFirst()) it.getLong(0) else 0 }
            splits.put(JSONObject().put("app",app).put("name",name).put("count",count(app)).put("millis",ms))
        }
        val hours=IntArray(24)
        readableDatabase.rawQuery("SELECT hour,COUNT(*) FROM reels WHERE day=? GROUP BY hour",arrayOf(day)).use { while(it.moveToNext()) hours[it.getInt(0)]=it.getInt(1) }
        val week=JSONArray()
        for(i in 6 downTo 0) { val date=LocalDate.now().minusDays(i.toLong()).toString(); week.put(JSONObject().put("date",date).put("count",count(day=date))) }
        val sessions=JSONArray()
        readableDatabase.rawQuery("SELECT session, app, MIN(at), MAX(at), COUNT(*) FROM reels WHERE day=? GROUP BY session,app ORDER BY MAX(at) DESC LIMIT 20",arrayOf(day)).use {
            while(it.moveToNext()) sessions.put(JSONObject().put("id",it.getString(0)).put("app",it.getString(1)).put("start",it.getLong(2)).put("end",it.getLong(3)).put("count",it.getInt(4)))
        }
        return JSONObject().put("day",day).put("count",count()).put("splits",splits).put("hours",JSONArray(hours.toList())).put("week",week).put("sessions",sessions)
            .put("config",config()).put("lastAi",prefs.getString("lastAi","AI is off. Local detection is ready."))
            .put("allowanceExpiry",prefs.getLong("allowanceExpiry",0)).put("backendUrl",prefs.getString("backendUrl",""))
    }
    @Synchronized fun clear() {
        writableDatabase.delete("reels",null,null); writableDatabase.delete("duration",null,null)
        prefs.edit().remove("allowanceExpiry").remove("allowanceUntilCount").apply()
    }
}
