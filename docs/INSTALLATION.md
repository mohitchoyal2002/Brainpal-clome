# Installing the development build

## The Play Protect message in Downloads

“App blocked to protect your device”, followed by “This app can request access to sensitive data”, is Google's Internet-sideloading protection. Google's developer guidance lists Accessibility among the permissions that can trigger it for APKs installed from browsers, messaging apps and file managers. It is distinct from an invalid APK, an incompatible Android version, a signing mismatch, and Android's post-install restricted-settings switch.

BrainPal uses an AccessibilityService for cross-app reel recognition and the user's limit overlay. A Gemini API key cannot replace that Android access. Removing Accessibility would remove automatic reel counting and enforcement. A new version, certificate, filename or icon is not a reliable solution to this protection.

## Development testing with a computer

Use the normal Android development workflow on your own test phone:

1. Install the official Android SDK Platform Tools on a trusted computer.
2. On the phone, enable Developer options and USB debugging. Connect by USB and approve that computer on the phone.
3. From the directory containing the APK, run:

```sh
adb devices
adb install -r BrainPal-RN-1.1.1-Gemini-arm64.apk
```

The phone must appear as `device`, not `unauthorized`. This invokes Android's development installer and reports an actual Package Manager error when installation fails. It does not disable Play Protect, grant Accessibility, or guarantee that a device security policy permits the install. If a policy blocks it, stop and use app review/distribution through Google Play.

If the result is `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, the installed package uses another signing key. Preserve any needed data before choosing to uninstall it. Do not uninstall solely because of the Play Protect screenshot: that screenshot does not establish a signing conflict. No downgrade flags or verifier changes are required.

After a successful install, open BrainPal, review the disclosure and explicitly enable its Accessibility service. App info → Allow restricted settings, when Android offers it, addresses an installed app's disabled Accessibility toggle; it cannot resolve the Downloads installation block.

## Access reduced in 1.1.1

- Removed the unused `SYSTEM_ALERT_WINDOW` permission and its settings entry. The counter and limit screen use Android's Accessibility overlay.
- Removed interactive-window retrieval and windows-changed callbacks. Event delivery is restricted to BrainPal and supported social packages, then narrowed to the user's selections when monitoring and consent are enabled.
- No foreground layout polling while monitoring is paused. Password and editable input nodes are skipped; only the active social-app tree is inspected.
- Usage Access remains optional app-time diagnostics. It never invents reel counts. Gemini remains optional, with separate consent and server-only credentials.

These changes reduce access. They do not establish a Google Play Protect approval.

## Phone-only distribution and review

For ordinary tap-to-install distribution, resolve the classification with Google and/or distribute a reviewed build using a Google Play testing track. This project has not been submitted or approved. A private testing track still needs a developer account, the applicable Accessibility declarations/disclosures and Google review; it is not an automatic exemption. Use a private release signing key for Play publication, not this development build's signing key.

Evidence for a developer appeal: package `com.brainpalrn`, the APK's SHA-256 and signing certificate from the build validation, the warning screenshot, the source repository, and an explanation of selected-app layout access, explicit consent, local counts, the absence of SMS/notification-listener access, and optional sanitized Gemini requests. No appeal has been sent on the user's behalf.

Official references:

- [Google Play Protect warning guidance and appeal](https://developers.google.com/android/play-protect/warning-dev-guidance)
- [Android development installation with adb](https://developer.android.com/tools/adb#move)
- [Run apps on a hardware device](https://developer.android.com/studio/run/device)
- [Platform Tools downloads](https://developer.android.com/tools/releases/platform-tools)
