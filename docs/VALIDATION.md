# Validation — BrainPal RN 1.1.0 — 27 October 2026

| Check                       | Result                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Standalone Android release  | Passed, React Native 0.88.0, arm64-v8a, version 1.1.0 / code 2                                                              |
| Counter unit tests          | 8 passed, zero failures/errors/skips                                                                                        |
| TypeScript and React lint   | Passed                                                                                                                      |
| UI regression               | Passed: disclosure, zero initial counts, monitoring paused                                                                  |
| Backend regression          | 6 suites passed, including actual SQLite and PostgreSQL-engine HTTP contracts, auth, invites, isolation, quota and deletion |
| Gemini model access         | Live Google model listing accepted the supplied key and returned gemini-3.5-flash-lite                                      |
| Live Gemini viewer sample   | HTTP 200; short_video / high; accepted by the production response parser                                                    |
| Live Gemini comments sample | HTTP 200; other / high; rejected by the production response parser                                                          |
| Quota/error behavior        | Tested: one request, no paid-model retry/fallback, local counting independent of AI                                         |
| APK signing                 | Verified using APK Signature Scheme v2, development key for personal installation                                           |
| Bundled app                 | Embedded Hermes bundle, 1,232,788 bytes; no Metro server required                                                           |
| API-key storage             | Saved only in the private Vercel project environment; absent from app/source                                                |

The two synthetic live calls took approximately 20.6s and 7.8s. They verify connection and response format, not real-world scroll accuracy. The backend now allows 25s for a classification and Android 28s; the UI and local counter do not wait for these calls. A delayed layout approval requires the same foreground package, current layout structure and session generation, and a fresh obstruction check. It cannot replay the old swipe.

The Postgres regression uses the PGlite PostgreSQL engine with the production Postgres adapter and real HTTP API routes. A hosted Neon connection is still needed to verify the external TLS/database connection. This is explicitly distinct from completed local SQL contract testing.

## Deployment status

The dedicated Vercel project is `brainpal-native-api`. Gemini credentials and the selected model are configured privately. Hosted deployment and app-to-server verification await a persistent database connection; Neon is the selected free option. No paid plan or billing verification was enabled.

## Phone checks still needed

No Android phone was connected. Confirm permission return flow, reels versus feeds/comments, rapid scrolling, overlays, challenges, widgets, PNG sharing and Android 15–17 behavior using DEVICE_VERIFICATION.md. No accuracy percentage is claimed. Visual styling follows the supplied palette/spec, not verified original screenshots.

The API integration has switched from Jev to direct Gemini. An update requires fresh Gemini-specific consent, including the free-tier data-use disclosure. Existing local history is retained. The AI is optional and starts off.
