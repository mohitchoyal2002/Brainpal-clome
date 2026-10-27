package com.brainpalrn.core

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.util.ArrayDeque

data class ScreenEvidence(val known: Boolean, val candidate: Boolean, val blocked: Boolean, val identity: String, val ids: List<String>, val markers: Set<String>) {
    fun publicState(app: String, scroll: Boolean, dy: Int, dx: Int, page: Int): JSONObject = JSONObject()
        .put("appPackage",app).put("resourceIds",JSONArray(ids)).put("markers",JSONArray(markers.toList()))
        .put("knownShortVideoSurface",known).put("obstructed",blocked).put("verticalScroll",scroll)
        .put("deltaY",dy.coerceIn(-3000,3000)).put("deltaX",dx.coerceIn(-3000,3000)).put("pageIndex",page)
    companion object {
        private val knownIds=listOf("clips_viewer_view_pager","clips_media_component","clips_video_container","reel_recycler","reel_player_page_content","reels_viewer","shorts_player","spotlight_player","feed_view_pager","reels_video_container","reels_pager")
        private val pagerIds=knownIds+listOf("viewpager","view_pager","recycler_view","feed_pager","video_container")
        private val words=setOf("reels","shorts","spotlight","for you","following","live","comments","messages","inbox","reel","like","share","subscribe")
        fun isPager(node: AccessibilityNodeInfo?): Boolean {
            var n=node
            repeat(7) {
                if(n==null)return false
                val id=n?.viewIdResourceName?.substringAfter(":id/")?.lowercase().orEmpty()
                if(pagerIds.any { id.contains(it) }) return true
                if(n?.className?.toString()?.contains("ViewPager",true)==true) return true
                n=n?.parent
            }
            return false
        }
        fun read(root: AccessibilityNodeInfo?, width: Int, height: Int): ScreenEvidence {
            if(root==null)return ScreenEvidence(false,false,true,"",emptyList(),emptySet())
            val q=ArrayDeque<AccessibilityNodeInfo>(); q.add(root)
            val ids=linkedSetOf<String>(); val markers=linkedSetOf<String>(); val identity=StringBuilder()
            var known=false; var obstructed=false; var nodes=0
            while(q.isNotEmpty() && nodes++<350) {
                val n=q.removeFirst()
                if(!n.isVisibleToUser || n.isPassword || n.packageName!=root.packageName)continue
                // No input-field contents are needed to recognize a video viewer.
                if(n.isEditable) {
                    if(n.isFocused)obstructed=true
                    continue
                }
                val bounds=Rect(); n.getBoundsInScreen(bounds)
                val id=n.viewIdResourceName?.substringAfter(":id/").orEmpty().take(100)
                if(id.isNotEmpty())ids.add(id)
                if(knownIds.any { id.contains(it,ignoreCase=true) } && bounds.height()>height*0.42 && bounds.width()>width*0.55) known=true
                if(listOf("comments_sheet","comments_recycler","comment_list","direct_inbox","live_viewer","search_results","bottom_sheet","comment_composer").any { id.contains(it,true) }) obstructed=true
                val text=n.text?.toString()?.trim()?.lowercase().orEmpty()
                val desc=n.contentDescription?.toString()?.trim()?.lowercase().orEmpty()
                words.filter { it==text || it==desc }.forEach { markers.add(it) }
                // Used only as a local digest. Content never leaves the device.
                if(listOf("caption","username","author_name","channel_name","video_title").any { id.contains(it,true) } && !n.isEditable) {
                    identity.append(id).append(text.take(160)).append(desc.take(160))
                }
                for(i in 0 until n.childCount.coerceAtMost(60))n.getChild(i)?.let { q.add(it) }
            }
            val digest=if(identity.isEmpty()) "" else MessageDigest.getInstance("SHA-256").digest(identity.toString().toByteArray()).take(12).joinToString("") { "%02x".format(it) }
            val candidate=known || markers.any { it in setOf("reels","shorts","spotlight","for you") } || ids.any { it.contains("reel",true) || it.contains("shorts",true) || it.contains("spotlight",true) }
            return ScreenEvidence(known,candidate,obstructed,digest,ids.take(65),markers)
        }
    }
}
