# Twinkle Twist

A puzzle game for Android. The board is full of cable pieces lying every which way. Tap a piece
and it turns a quarter turn. When every cable connects back to the power socket, every lamp lights
up and the level is done. Fewer moves earn more stars.

The game starts on a 3×3 board and grows to 7×9. New elements appear along the way:

| From level | New |
| --- | --- |
| 16 | Screwed-down pieces that already face the right way |
| 22 | Holes in the board that the string has to go around |
| 29 | Twins: two pieces that turn together |
| 50 | Every fifth level has edges that wrap around |

The level curve lives in `levelSpec()` in `core.js` and is easy to change.

## How the project is organized

| Part | Where | What it does |
| --- | --- | --- |
| The game | `app/src/main/assets/` | HTML, CSS and JavaScript. `core.js` generates levels, `game.js` is the UI. |
| Android shell | `app/src/main/java/.../MainActivity.kt` | Shows the game in a WebView and handles the back button. |
| The bridge | `GameBridge.kt` | What the game can ask the app for: ads, vibration, privacy choices. |
| Ads | `AdsManager.kt` | All AdMob code: consent, banner, interstitial, rewarded ad. |
| Ad unit ids | `app/src/main/res/values/ads.xml` | Google's test ids. Real ids go in the release build, see below. |

## Building

**Android Studio:** open the folder, wait for the sync to finish and press Run. If Android Studio
suggests upgrading the Gradle plugin, it is fine to accept.

**GitHub Actions (no computer with Android Studio needed):** push the project to a GitHub repo.
The workflow `.github/workflows/build-apk.yml` builds a debug APK with test ads, and the file can
be downloaded under the run's Artifacts.

Status: the Gradle build has not been run yet. The Kotlin code is type-checked against Android
API 36, but the calls to AdMob, consent and AndroidX have only been checked against local stubs.
Expect the first build to possibly need a small version adjustment in `gradle/libs.versions.toml`.

## Turning on real ads

1. Create the app in AdMob and three ad units: banner, interstitial and rewarded.
2. Copy `ads.release.example.xml` to `app/src/release/res/values/ads.xml` and fill in the ids.
   The debug build keeps showing test ads, the release build shows real ones.
3. Create a GDPR message in AdMob under Privacy & messaging. The app shows it automatically.
4. Add your phone as a test device in AdMob. Never click your own real ads.
5. Publish an `app-ads.txt` on the website you list in Google Play.

Ads are shown like this, and can be changed at the top of `game.js`:

- A banner below the board, in its own area.
- An interstitial every third completed level, starting at level 6 at the earliest and at most one per minute.
- A rewarded ad gives 2 hints when the player has run out.

## Before publishing

- Change `applicationId` and `namespace` in `app/build.gradle.kts` to your own package name. It
  cannot be changed after the first upload.
- Choose the target audience 13 and older in Play Console. If you target younger children, the
  Families policy applies, and that requires different ad settings.
- Fill in Data safety: the ads SDK collects device ids and approximate location.
- The app uses `play-services-ads` (the older SDK, which Google has put in maintenance mode).
  It works, but a move to the GMA Next-Gen SDK may become relevant later.
- The game idea, turning pieces until a network connects, is an old and common puzzle genre.
  The name, graphics, levels and code are original.

## The test build without ads

`tools/test-apk/` contains a small Java shell without the ads SDK and a build script that does not
need Gradle:

    sh tools/test-apk/build.sh /path/to/android.jar

The game is the same, but a placeholder appears where the ads would otherwise be shown.

## Licenses

The Bricolage Grotesque typeface is licensed under the SIL Open Font License, see
`licenses/BricolageGrotesque-OFL.txt`.
