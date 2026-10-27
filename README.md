# BrainPal RN

A React Native Android rebuild from the supplied **BRAINPAL_ANALYSIS.md**: short-video detection, counting, limits, physical unlock challenges, receipts, insights, a widget, and private Scroll Battles. Optional **Google Gemini Flash-Lite** uses the direct Gemini Developer API through a server that keeps the key out of the APK. No Vercel AI Gateway account verification is involved.

The source document contains static analysis, not screen captures or runtime traces. This implementation follows the recovered cream/pink/gold palette and feature descriptions, with an original vector brain buddy. It is a functional reconstruction, not a verified pixel-exact reproduction of unavailable screens.

## Run the Android app

Use Node 22.11 or later, Java 17 or later, Android Studio, Android SDK 37 / build tools 37.0.0, NDK 27.1.12297006 and CMake 3.22.1. The app targets SDK 36 and supports Android API 29 and later. Android 15–17 phone testing is still required.

```bash
npm ci
npm start
# In another terminal, with a device/emulator connected:
npm run android
```

Create `android/local.properties` with your own `sdk.dir` if Android Studio has not created it. For a standalone arm64 test APK with its JS bundle included:

```bash
npm run apk
```

Output: `android/app/build/outputs/apk/release/app-release.apk`. It uses a local development signing key for personal testing, generated automatically when missing. No signing key is stored in Git. Keep your local key to install future builds over existing ones; builds from a fresh CI runner use a new test key and may require uninstalling an earlier differently signed APK. The separate package `com.brainpalrn` can coexist with TimeLens. Configure your own protected release keystore before public distribution. The APK needs no Metro server.

On first launch, agree to the layout-access disclosure, enable **BrainPal · Reels detector** in Android Accessibility, return to the app, and turn monitoring on. Usage Access, notifications and battery settings are optional. Android rebinds an enabled accessibility service; no prohibited foreground-service restart from a boot receiver is used. The detector, SQLite store, overlay and AI client run natively and do not depend on the React Native UI remaining alive.

## Connect Gemini securely

1. In `server`, run `npm ci` and copy `.env.example` to an uncommitted `.env.local`.
2. Set **GEMINI_API_KEY** on the server using a Google AI Studio key. **GEMINI_MODEL=gemini-3.5-flash-lite** is the default. It was returned by the live model list and its current pricing lists a free tier. Keep the Google project on its Free tier to avoid paid API usage. Never put the key in `App.tsx`, Android settings, Git, or the APK.
3. Local development uses `DATABASE_URL=file:brainpal.db`. Start `npm start` inside `server`.
4. For Vercel, deploy **server/** as the project root with a persistent **Neon Postgres** `DATABASE_URL`, plus `RATE_LIMIT_SALT`. A free Neon database requires no payment card. An existing `libsql://` URL plus `DATABASE_AUTH_TOKEN` also works. Ephemeral Vercel disk is deliberately rejected. `/api/health` reports the model and whether a key exists, without exposing it.
5. In **You → Your private connection**, enter your backend's HTTPS origin and connect. Enable **Gemini AI assistance** and accept its disclosure. Upgrading from 1.0 requires fresh AI consent. Debug builds can use `http://10.0.2.2:8787`; the standalone APK requires HTTPS.

The server calls `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent` using the `x-goog-api-key` header and a strict JSON schema. It does not route calls through Vercel AI Gateway.

- Known layouts are recognized locally. Gemini only helps with uncertain viewer structures.
- A response must classify the surface as `short_video` with `high` qualitative confidence, contain resource IDs and have no obstruction before it can approve the layout. This confidence is **not** a calibrated accuracy probability. Legacy 1.0 compatibility fields named `*Probability` carry only binary routing values; the 1.1 APK uses the explicit decision and confidence fields.
- Android events and the native state machine still control counts. The cloud cannot replay old swipes or invent missed reels. A delayed classification is applied only to the current matching app, layout shape and session generation, after a fresh obstruction check.
- Approvals expire in 60 seconds. Requests are limited to one in flight, at least 15 seconds apart, with device/global quotas (default 60/500 per UTC day). Provider quota exhaustion stops AI use; no paid model fallback is configured.
- Free-tier latency varied from about 8 to 21 seconds in the first two live sample calls. The server times out after 25 seconds and Android after 28 seconds. Local detection remains independent of these network calls.
- Only selected app packages, bounded resource IDs, fixed interface labels and numeric scroll fields leave the phone. No screenshots, arbitrary screen text, message text, raw captions, or passwords are uploaded. Caption/author identity digests remain local.
- Google may use Free-tier API input/output to improve its products; the AI consent explains this. Disable AI to keep detection local.
- Tokens are random device credentials, hashed in the database and encrypted using Android Keystore on the phone. Server logs exclude API keys, authorization headers and evidence bodies.

Official references: [Gemini REST API](https://ai.google.dev/api/generate-content), [structured output](https://ai.google.dev/gemini-api/docs/structured-output), [free-tier pricing](https://ai.google.dev/gemini-api/docs/pricing), [Neon free plan](https://neon.com/pricing).

## Features and parity

| Area             | Implemented behavior                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main UI          | Consent onboarding, Today, Insights, Limits, Scroll Battle, You, permission setup, custom dialogs, brief transitions and haptics                                           |
| Reels            | Instagram/YouTube IDs from the specification plus viewer evidence for TikTok, Snapchat and Facebook; first-view and settled vertical transition counting                   |
| Noise handling   | Duplicate callbacks, content refreshes, horizontal swipes, comments/editable panels and same-reel returns are suppressed conservatively                                    |
| History          | Native SQLite events, daily app splits, measured viewer duration, hourly bars, seven-day totals, session list, 90-day pruning                                              |
| Limits           | Total daily budget, per-app budgets, native touch-blocking overlay, Home exit, temporary earned allowances                                                                 |
| Challenges       | 30 steps, 10 estimated jumps, 30 seconds face down, 60 seconds thumb detox, 30 deliberate swipes, physical NFC card tap                                                    |
| Shares           | Actual PNG receipt and weekly story through Android's share sheet                                                                                                          |
| Notifications    | Optional playful milestone nudge every 50 counted reels                                                                                                                    |
| Widget           | Native resizable BrainPal counter with buddy icon, event updates and periodic/date/boot refresh                                                                            |
| Social           | Private backend registration, single-use expiring friend invites, daily totals, standings, account deletion; counts are self-reported and sync when Battle opens/refreshes |
| Offline fallback | Continues local rules. UsageStats exposes whole-app time separately, never an invented reel estimate                                                                       |
| Gemini           | Server-only Google key, direct JSON-schema responses, conservative classification, quota handling, timeout and no paid fallback                                            |

Not reproduced: the original company's private backend and realtime Couchbase network, its ad/attribution SDKs, original GIF/video assets, billing/subscription business, pinned-friend remote settings controls, multiple original widget variants and promotional notification campaigns. These are not shown as working or backed by fake data. Forehead skin cannot be read as an NFC tag; the real NFC-card challenge is supplied. An NFC card tap detects a tag, not an authenticated identity. Jump detection can mistake shaking for exercise.

The iOS template is included for UI portability only. Cross-app reels monitoring in this implementation is Android-only.

## Validation

```bash
npm run typecheck
npm run lint -- --quiet
npm test -- --runInBand
npm run test:api
cd android
./gradlew testDebugUnitTest -PreactNativeArchitectures=arm64-v8a
```

The pure Kotlin detector tests cover first entry, duplicate events, horizontal swipes, comments, same-reel return, app switches, motion fallback and the native evidence boundary for AI. Backend tests exercise actual SQLite persistence and HTTP registration, auth, stat isolation, invitations, quotas, the Gemini contract and deletion. Two live Gemini sample calls passed (viewer accepted, comments rejected). This verifies the connection and response contract, not real-device accuracy. A hosted database connection and phone traces are still required for end-to-end verification.

An optional design preview uses `npm run preview`; `npm run preview:build` produces `web-preview/`. This is the same React UI with an explicit Android-only banner and honest zero-count state. It does not simulate real monitoring or fabricate friend activity.

Follow [the device verification checklist](docs/DEVICE_VERIFICATION.md) before trusting counts. Missed Android events, changed or obfuscated third-party accessibility trees, service restarts and rapid gestures can affect accuracy. No percentage improvement is claimed.

## Repository builds

The GitHub Actions workflow runs UI/API checks and builds a standalone arm64 APK. After a successful run, download **BrainPal-RN-arm64** from that run's artifacts. CI needs no Gemini key: provider calls are mocked in regression tests, while API secrets remain in the hosting environment.
