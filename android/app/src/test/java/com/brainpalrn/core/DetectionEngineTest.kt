package com.brainpalrn.core
import org.junit.Assert.*
import org.junit.Test

class DetectionEngineTest {
    private fun e(now:Long=1000,fingerprint:String="a",scroll:Boolean=false,page:Int=0,dy:Int=0,dx:Int=0,obstructed:Boolean=false,app:String="ig")=Evidence(app,now,true,obstructed,scroll,scroll,dy,dx,page,fingerprint)
    @Test fun firstReelThenOnlySettledTransitionsCount() {
        val engine=DetectionEngine()
        assertNotNull(engine.observe(e()))
        assertNull(engine.observe(e(now=1800,fingerprint="b"))) // playback/content refresh
        assertNotNull(engine.observe(e(now=2200,fingerprint="b",scroll=true,page=1,dy=600)))
        assertNull(engine.observe(e(now=2300,fingerprint="b",scroll=true,page=1,dy=700)))
    }
    @Test fun commentsAndHorizontalCarouselsNeverCount() {
        val engine=DetectionEngine();engine.observe(e())
        assertNull(engine.observe(e(now=2000,scroll=true,page=1,dy=2,dx=500)))
        assertNull(engine.observe(e(now=3000,obstructed=true)))
        assertNull(engine.observe(e(now=4000)))
    }
    @Test fun repeatedWindowEventsDoNotDoubleCount() {
        val engine=DetectionEngine();engine.observe(e())
        for(t in 1100L..6000L step 100)assertNull(engine.observe(e(now=t)))
    }
    @Test fun leavingAndReturningToSameReelDoesNotCount() {
        val engine=DetectionEngine();engine.observe(e());engine.leave(3000)
        assertNull(engine.observe(e(now=20000)))
    }
    @Test fun differentAppHasIndependentEntry() {
        val engine=DetectionEngine();engine.observe(e());engine.leave(2000)
        assertNotNull(engine.observe(e(now=2200,app="youtube")))
    }
    @Test fun noIdentityFallsBackToVerticalMotionButIgnoresTinyScrolls() {
        val engine=DetectionEngine();engine.observe(e(fingerprint="",page=-1))
        assertNull(engine.observe(e(now=2000,fingerprint="",scroll=true,page=-1,dy=4)))
        assertNotNull(engine.observe(e(now=3000,fingerprint="",scroll=true,page=-1,dy=700)))
    }
    @Test fun sameIdentityWithoutNewPageIgnoresRepeatedScrollCallback() {
        val engine=DetectionEngine();engine.observe(e())
        assertNull(engine.observe(e(now=3000,scroll=true,dy=600)))
    }
    @Test fun cloudCannotCountWithoutPhysicalTransition() {
        val engine=DetectionEngine();engine.observe(e().copy(source="jev"))
        assertNull(engine.observe(e(now=3000,fingerprint="b").copy(source="jev")))
    }
}
