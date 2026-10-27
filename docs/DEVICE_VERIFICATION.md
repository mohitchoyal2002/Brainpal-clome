# Phone verification

This is a React Native Android app with a Kotlin accessibility service. Its UI and server can be checked without a phone; cross-app accuracy and OEM permission behavior require real-device tests. No physical phone was connected during implementation.

## First launch, Android 15–17

1. Install the standalone arm64 APK. It uses the separate package `com.brainpalrn`, so it can coexist with TimeLens and the original BrainPal. If Play Protect blocks Downloads installation, follow [development installation and review](INSTALLATION.md). Post-install restricted settings do not fix that installation block.
2. Read the accessibility disclosure and explicitly agree.
3. Open Recognize reels. Enable **BrainPal · Reels detector** under Accessibility / Installed apps. For an APK blocked by restricted settings, use App info → menu → Allow restricted settings when that option is offered by Android.
4. Return to BrainPal. Verify Accessibility shows **Granted**, and service status says **connected**. Toggle monitoring on.
5. Usage Access is optional. Its card must reflect the actual AppOps grant after returning from Settings. Opening an empty usage history must not be treated as permission denial.
6. Decline notifications and battery access. Counting must still run with Accessibility alone. Permission cards must never falsely show a grant.
7. Revoke Accessibility in Android Settings. BrainPal should show monitoring paused. Re-enable and test recovery after Android binds the service again.
8. Only selected supported social packages should deliver detector events. Pause monitoring, remove a selected app, switch to a non-social app, and lock the phone: no counts or active overlay should remain. Switching out of a social app may take up to the one-second foreground check to hide the overlay.

## Counting, separately for each selected app

Instagram Reels, YouTube Shorts, TikTok / TikTok Lite, Snapchat Spotlight, and Facebook Reels have different accessibility trees. Test only apps available on your device.

1. Start on a normal app feed. No short-video count should be added just for opening the app.
2. Open a short-video viewer: the first reel is one view. Swipe up slowly 10 times and compare the visible counter to a manual tally of 11.
3. Watch one video for 60 seconds, like it, open and close comments, pause/play, and swipe a horizontal carousel. None should increment the reel count.
4. Scroll comments. Close them and return to the same reel. The count should not change.
5. Test rapid swipes, swiping back, bounce gestures that stay on the same reel, mini-player playback, live streams, and switching between apps.
6. Open the notification shade, lock the phone, and leave for the home screen. Duration must stop while no video viewer is active. A small one-second sampling boundary in measured duration is expected.
7. Reopen the same reel. It should not count again just because a settings/overlay window closed. Test background killing and service restart separately; an in-memory identity is lost after process death.
8. Keep the phone offline. Known viewer detection should keep counting, and Gemini failure must never fabricate events or disable local limits.

## Limits and challenges

1. Set a daily budget of three reels. Reach three in a viewer. Verify a full overlay prevents touching the underlying reel while Android navigation remains available.
2. Choose "I'm done scrolling" and verify it goes Home.
3. Complete a supported challenge, then verify exactly the chosen allowance is earned and expires after the configured time/count.
4. Test 30 steps with the step-counter permission granted, then denied. Hardware without a step counter must offer alternatives.
5. Test face down for 30s, interrupted face down, app switching during thumb detox, 30 distinct upward swipes, ten jumps and NFC with NFC disabled/no tag. Motion peaks are approximate jump detection, not proof of exercise; shaking can imitate them.
6. Do not present a forehead tap as NFC verification. Skin is not an NFC tag. The rebuild supplies the real NFC-card challenge instead.

## Gemini, sharing, social and data

1. Deploy the included server with persistent storage and `GEMINI_API_KEY`. Enter its HTTPS origin in Settings. Never put that key in the APK.
2. Enable Gemini only after its separate disclosure. Check the server configuration for `gemini-3.5-flash-lite` and direct `generateContent` requests to Google. Do not enable screenshots or raw screen-text uploads for testing.
3. Exercise an uncertain short-video layout. AI-approved surfaces should only count when the native state machine sees an entry or a real scroll transition. Uncertain classifications, stale responses, malformed answers, timeouts and quota exhaustion must leave counts conservative.
4. Compare counts on at least 100 manually labeled transitions per installed app, covering non-reel negative cases. Report missed counts and extra counts separately. No measured accuracy improvement is claimed before this comparison.
5. Share a receipt and weekly story. Confirm they open as actual PNGs in an Android share target with temporary URI permission.
6. Add the counter widget. Verify updates after a reel, at local midnight, on reboot, and after clearing history.
7. Connect a second installation to the same backend, create/accept an invite, sync both from Battle, and verify each person's totals. A third unrelated installation must not see their stats.
8. Delete a server account; confirm its token stops working and friendships disappear. Clear local history separately and confirm totals/widgets reset.

## Build identity

The provided test APK uses the template's development signing key for direct installation and is not a Play Store release. Generate and protect your own signing key before a public release. React Native UI is portable, but iOS cannot provide this Android cross-app AccessibilityService; no iOS monitoring support is claimed.
