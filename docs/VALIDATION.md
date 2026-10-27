# Validation — BrainPal RN 1.1.1 — 27 October 2026

| Check                       | Result                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Standalone Android release  | Passed, React Native 0.88.0, arm64-v8a, version 1.1.1 / code 3                                                              |
| Counter unit tests          | 8 passed, zero failures/errors/skips                                                                                        |
| TypeScript and React lint   | Passed                                                                                                                      |
| UI regression               | Passed: disclosure, zero initial counts, monitoring paused                                                                  |
| Backend regression          | 6 suites passed, including actual SQLite and PostgreSQL-engine HTTP contracts, auth, invites, isolation, quota and deletion |
| Gemini model access         | Live Google model listing accepted the supplied key and returned gemini-3.5-flash-lite                                      |
| Live Gemini viewer sample   | HTTP 200; short_video / high; accepted by the production response parser                                                    |
| Live Gemini comments sample | HTTP 200; other / high; rejected by the production response parser                                                          |
| Quota/error behavior        | Tested: one request, no paid-model retry/fallback, local counting independent of AI                                         |
| APK signing                 | Verified using APK Signature Scheme v2, development key for personal installation                                           |
| Bundled app                 | Embedded Hermes bundle; no Metro server required                                                                           |
| API-key storage             | Saved only in the private Vercel project environment; absent from app/source                                                |

The two synthetic live calls took approximately 20.6s and 7.8s. They verify connection and response format, not real-world scroll accuracy. The backend now allows 25s for a classification and Android 28s; the UI and local counter do not wait for these calls. A delayed layout approval requires the same foreground package, current layout structure and session generation, and a fresh obstruction check. It cannot replay the old swipe.

The Postgres regression uses the PGlite PostgreSQL engine with the production Postgres adapter and real HTTP API routes. The external pooled Neon TLS/database connection was also verified through the hosted production API: two device registrations, authentication, initially private/empty friend lists, totals sync, invite creation and acceptance, friend-only totals, rejection of invite reuse and account deletion. Unauthenticated requests to both single-part and nested routes returned 401. Explicit Vercel entry files cover invite acceptance and deletion; testing found the original single dynamic entry did not route those nested paths.

## Deployment status

The dedicated Vercel project is `brainpal-native-api`, live at `https://brainpal-native-api.vercel.app` (production, Node 24, Singapore). It uses a new dedicated Neon project in Singapore in the connected account's verified Free organization, with 0.25 CU limits. No paid plan or billing verification was enabled. `DATABASE_URL`, Gemini credentials and the quota salt are private production environment variables. Production is reachable without a Vercel account; app endpoints still enforce device authentication and quotas.

Through the hosted authenticated `/api/evaluate` endpoint, the synthetic viewer returned HTTP 200 / short_video / high / accepted in 16.6s including client network overhead, and the comments sheet returned HTTP 200 / rejected in 10.4s. The new validation accounts were removed through the real account deletion endpoint. No accuracy percentage is inferred from these samples.

## Installation and permission changes

The user supplied a Samsung screenshot of Play Protect's “App blocked to protect your device” sensitive-data warning. Google's developer guidance identifies Internet-sideloaded Accessibility apps as a trigger. This was not evidence of a bad APK signature or a signing conflict.

Version 1.1.1 removes unused `SYSTEM_ALERT_WINDOW`, its bridge entry and obsolete state, interactive-window retrieval and windows-changed callbacks. Static package subscriptions cover only BrainPal and supported social apps; runtime subscriptions narrow to selected supported packages after consent. Monitoring paused means no foreground-layout polling. Editable input nodes and nodes from another package are skipped. All eight native detector tests and the UI/type/lint checks passed after these changes. The final APK source was compared against the workspace's changed app files.

The final release manifest has no unused overlay permission and is not debuggable. APK Signature Scheme v2 verification passed. SHA-256: `c795cf0ef2c977d74f9fb07b5553551bf116d5c5b834eb4754dd14ed30223ab4`; signing-certificate SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` (same local development key as the prior personal-test APK). No signing key is committed.

**Play Protect acceptance is not verified.** Accessibility is still required, so another Downloads install may still be blocked. [INSTALLATION.md](INSTALLATION.md) documents normal ADB development installation and Google's review/appeal route without disabling protection or spoofing installer identity. No appeal or Play submission has been sent.

## Phone checks still needed

No Android phone was connected. Confirm permission return flow, reels versus feeds/comments, rapid scrolling, overlays, challenges, widgets, PNG sharing and Android 15–17 behavior using DEVICE_VERIFICATION.md. No accuracy percentage is claimed. Visual styling follows the supplied palette/spec, not verified original screenshots.

The API integration has switched from Jev to direct Gemini. An update requires fresh Gemini-specific consent, including the free-tier data-use disclosure. Existing local history is retained. The AI is optional and starts off.
