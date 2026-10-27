package com.brainpalrn.core

import kotlin.math.abs

/** Pure, monotonic-clock state machine. Remote classifications cannot manufacture swipes. */
data class Evidence(
    val app: String,
    val now: Long,
    val surface: Boolean,
    val obstructed: Boolean = false,
    val scroll: Boolean = false,
    val pager: Boolean = false,
    val deltaY: Int = 0,
    val deltaX: Int = 0,
    val page: Int = -1,
    val fingerprint: String = "",
    val source: String = "local",
)

data class CountedReel(val app: String, val source: String, val reason: String)

class DetectionEngine {
    private var app = ""
    private var active = false
    private var lastCount = Long.MIN_VALUE / 2
    private var lastEvent = Long.MIN_VALUE / 2
    private var lastPage = -1
    private var fingerprint = ""
    private var scrollBurst = 0
    private var exitAt = Long.MIN_VALUE / 2

    fun leave(now: Long) {
        if (active) exitAt = now
        active = false
        scrollBurst = 0
    }

    fun observe(e: Evidence): CountedReel? {
        if (e.obstructed || !e.surface) { leave(e.now); return null }
        if (app != e.app) {
            app = e.app; fingerprint = ""; lastPage = -1
            lastCount = Long.MIN_VALUE / 2; active = false; exitAt = Long.MIN_VALUE / 2
        }
        if (!active) {
            active = true
            // Reopening comments, system shade, or an unchanged reel is not another reel.
            val same = (e.fingerprint.isNotEmpty() && e.fingerprint == fingerprint) ||
                (e.now - exitAt < 12_000 && (e.page < 0 || e.page == lastPage))
            fingerprint = e.fingerprint.ifEmpty { fingerprint }
            lastPage = e.page
            lastEvent = e.now
            if (same) return null
            lastCount = e.now
            return CountedReel(e.app, e.source, "surface_entered")
        }
        // Caption/content, playback, likes, comments and horizontal carousels never count alone.
        if (!e.scroll || !e.pager || abs(e.deltaX) > abs(e.deltaY) + 24) return null
        val pageChanged = e.page >= 0 && lastPage >= 0 && e.page != lastPage
        val identityChanged = e.fingerprint.isNotEmpty() && fingerprint.isNotEmpty() && e.fingerprint != fingerprint
        if (e.now - lastEvent > 360) scrollBurst = 0
        scrollBurst += abs(e.deltaY).coerceAtMost(1600)
        lastEvent = e.now
        // A native service settles the burst first. At most one reel per settled transition.
        val transition = pageChanged || identityChanged || scrollBurst >= 180
        if (!transition || e.now - lastCount < 650) return null
        if (!pageChanged && !identityChanged && e.fingerprint.isNotEmpty() && e.fingerprint == fingerprint) {
            scrollBurst = 0; return null
        }
        lastPage = e.page
        fingerprint = e.fingerprint.ifEmpty { fingerprint }
        lastCount = e.now
        scrollBurst = 0
        return CountedReel(e.app, e.source, "vertical_transition")
    }
}
