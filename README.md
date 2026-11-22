# Twinkle Twist

A puzzle game for Android that also runs in a web browser. The board is full of cable pieces lying
every which way. Tap a piece and it turns a quarter turn. When every cable connects back to the
power socket, every lamp lights up and the level is done. Fewer moves earn more stars.

Play it in a browser: https://filipfogel.github.io/twinkle-twist/

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
| The game | `docs/play/` | HTML, CSS and JavaScript. `core.js` generates levels, `game.js` is the UI, `lang.js` holds the texts in every language. |
| Web site | `docs/` | Served by GitHub Pages: a landing page, the game under `play/`, the privacy policy and the terms. |
| Android shell | `app/src/main/java/.../MainActivity.kt` | Shows the game in a WebView and handles the back button. |
| The bridge | `GameBridge.kt` | What the game can ask the app for: ads, vibration, privacy choices, the share sheet and the rating dialog. |
| Ads | `AdsManager.kt` | All AdMob code: consent, interstitial, rewarded ad. |
| Ad unit ids | `app/src/main/res/values/ads.xml` | Google's test ids. Real ids go in the release build, see below. |
| Store page | `store-assets/` | Icon, feature graphic, the texts for Google Play in every language and links that show where installs come from. |
| Store screenshots | `tools/store-shots/` | Takes the captioned screenshots for Google Play in every language. |

The game's files live in `docs/play/` and nowhere else. The Android build takes its assets from that
folder (`sourceSets` in `app/build.gradle.kts`), and GitHub Pages serves the same folder as the web
version. Two things follow from that:

- Everything in `docs/play/` ends up inside the app.
- Every push to `main` updates the web version at once, also when the app on Google Play has not
  been updated yet.

## The web version

GitHub Pages serves the `docs/` folder at https://filipfogel.github.io/twinkle-twist/:

- `/` is a landing page with links to the game and to Google Play. On a wide screen the game can be
  played right on the page.
- `/play/` is the game. `/play/?daily` goes straight to today's daily string.

On the web the game has no ads. When a player runs out of hints, the dialog points to the daily
string, which gives one hint a day, and to the app. The menu has a link to the app on Google Play,
except on an iPhone or iPad.

To try the web version on your own computer, serve the folder over http and open
http://localhost:8000/play/ :

    python -m http.server 8000 --directory docs

Opened straight from disk, the game behaves like the test build instead and shows ad placeholders.

`WEB_URL` and `STORE_URL` at the top of `game.js` hold the address of the web version and of the
app's page on Google Play. Set `STORE_URL` to `''` to hide every link to Google Play in the game,
for example while the app is not public yet. The landing page has its own link in `docs/index.html`.

To put the game on another site, such as itch.io, zip the contents of `docs/play/` and upload the
zip as an HTML game.

## Languages

The game is in English, Swedish, German, French, Spanish, Brazilian Portuguese and Indonesian. It
follows the language of the phone or the browser and falls back to English. Players can pick
another language under Settings.

All texts are in `docs/play/lang.js`, one table per language. A text that is missing from a table
is shown in English. To add a language, copy the `en` table, translate it and add its code to
`order` and `names` at the bottom of the file. The typeface only contains Western European letters,
so a language with other letters also needs another font file.

Add `?lang=sv` to the address to see a language regardless of the settings.

None of the translations has been checked by a native speaker yet.

## Sharing and rating

- **Share result.** When the daily string is done, the win dialog has a Share result button. It
  makes a short text with the stars, the number of moves, the streak and a link to today's string
  on the web. The app opens Android's share sheet, a phone browser opens its own, and a desktop
  browser copies the text.
- **Rating.** The app lets Google Play ask for a rating after a three-star win from level 10 on, or
  when the daily streak reaches three days. It asks at most three times, at least three weeks
  apart, and never in the same break as an ad. Google Play decides whether its dialog really
  appears, and that only happens in a build installed from Google Play. The limits are set at the
  top of `game.js`.

## Christmas theme

From 22 November through 6 January, every year, the game dresses up for Christmas:

- Snow falls on the menu.
- A flurry of snow falls when a level or the daily string is done.
- `jingle-bells.mp3` plays in a loop as background music from the moment the app starts. It pauses
  when the app is left and during ads. Players can turn it off with the note button at the top of
  the game screen or the Music switch in Settings. Both are only shown while the theme is on.

Outside those dates there is no snow, no music and no music controls. The dates, the music volume
and the number of snowflakes are set at the top of `game.js`. To change the music, replace
`docs/play/jingle-bells.mp3`.

To see the game with the theme on or off regardless of the date, open
`docs/play/index.html` in a browser and add `?xmas=1` or `?xmas=0` to the address.
A browser only starts the music after the first tap. The app starts it right away.

## Building

**Android Studio:** open the folder, wait for the sync to finish and press Run. If Android Studio
suggests upgrading the Gradle plugin, it is fine to accept.

**GitHub Actions (no computer with Android Studio needed):** push the project to a GitHub repo.
The workflow `.github/workflows/build-apk.yml` builds a debug APK with test ads, and the file can
be downloaded under the run's Artifacts.

Status: the Gradle build has not been run yet. The Kotlin code is type-checked against Android
API 36, but the calls to AdMob, consent and AndroidX have only been checked against local stubs.
Expect the first build to possibly need a small version adjustment in `gradle/libs.versions.toml`.

## Release build for Google Play

The release build is signed with the upload key in `upload-keystore.jks`. Gradle reads its
passwords from `keystore.properties`. Neither file is in git, so keep a backup of both. Without
them you have to ask Google Play support to reset the upload key.

1. Raise `versionCode` by 1 in `app/build.gradle.kts`, and `versionName` if you like.
2. Run `./gradlew bundleRelease` (needs a JDK 17+ as `JAVA_HOME`).
3. Upload `app/build/outputs/bundle/release/app-release.aab` in Play Console.

## Turning on real ads

1. Create the app in AdMob and two ad units: interstitial and rewarded.
2. Copy `ads.release.example.xml` to `app/src/release/res/values/ads.xml` and fill in the ids.
   The debug build keeps showing test ads, the release build shows real ones.
3. Create a GDPR message in AdMob under Privacy & messaging. The app shows it automatically.
4. Add your phone as a test device in AdMob. Never click your own real ads.
5. Publish an `app-ads.txt` on the website you list in Google Play.

Ads are shown like this, and can be changed at the top of `game.js`:

- An interstitial every third completed level, starting at level 6 at the earliest and at most one per minute.
- A rewarded ad gives 2 hints when the player has run out.
- The web version shows no ads.

## The page on Google Play

- `store-assets/listing/` has the title, the short description, the full description and the
  release notes in each language, all within Google Play's length limits. The short description
  and the first paragraph come in two versions: one for the Christmas season and one for the rest
  of the year.
- `tools/store-shots/shots.js` takes five captioned screenshots per language, in one set for the
  whole year and one for Christmas. The top of that file says how to run it. The pictures land in
  `store-assets/shots/`, which is not in git.
- `store-assets/links.md` has one link to the app's page per place where the game is shared, so
  that Play Console can show where the installs come from.

## Before publishing

- The package name on Google Play is `app.twinkletwist` (`applicationId` in
  `app/build.gradle.kts`). It cannot be changed after the first upload.
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
