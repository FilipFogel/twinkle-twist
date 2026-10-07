# Ljusslinga

Ett pusselspel för Android. Brädet är fullt av sladdbitar som ligger huller om buller. Tryck på en
bit så vrids den ett kvarts varv. När alla sladdar hänger ihop med eluttaget lyser varje lampa
och nivån är klar. Färre drag ger fler stjärnor.

Spelet börjar på ett bräde med 3×3 rutor och växer till 7×9. På vägen kommer nya inslag:

| Från nivå | Nytt |
| --- | --- |
| 16 | Fastskruvade bitar som redan sitter rätt |
| 22 | Hål i brädet som slingan måste runt |
| 29 | Tvillingar: två bitar som vrids tillsammans |
| 50 | Var femte nivå har kanter som hänger ihop |

Nivåkurvan ligger i `levelSpec()` i `core.js` och är lätt att ändra.

## Så är projektet uppbyggt

| Del | Var | Vad den gör |
| --- | --- | --- |
| Spelet | `app/src/main/assets/` | HTML, CSS och JavaScript. `core.js` skapar nivåer, `game.js` är gränssnittet. |
| Android-skalet | `app/src/main/java/.../MainActivity.kt` | Visar spelet i en WebView och sköter bakåt-knappen. |
| Bryggan | `GameBridge.kt` | Det spelet kan be appen om: annonser, vibration, integritetsval. |
| Annonser | `AdsManager.kt` | All AdMob-kod: samtycke, banderoll, helskärmsannons, belönad annons. |
| Annons-id:n | `app/src/main/res/values/ads.xml` | Googles test-id:n. Riktiga id:n läggs i release-bygget, se nedan. |

## Bygga

**Android Studio:** öppna mappen, vänta på synkningen och tryck Run. Föreslår Android Studio
att uppgradera Gradle-pluginet går det bra att tacka ja.

**GitHub Actions (utan dator med Android Studio):** lägg projektet i ett GitHub-repo.
Arbetsflödet `.github/workflows/build-apk.yml` bygger en debug-APK med testannonser, och
filen hämtas under körningens Artifacts.

Status: Gradle-bygget är inte kört ännu. Kotlin-koden är typkontrollerad mot Android API 36,
men anropen till AdMob, samtycket och AndroidX är bara kontrollerade mot egna stubbar. Räkna
med att första bygget kan kräva en mindre justering av versioner i `gradle/libs.versions.toml`.

## Slå på riktiga annonser

1. Skapa appen i AdMob och tre annonsenheter: banderoll, helskärm (interstitial) och belönad.
2. Kopiera `ads.release.example.xml` till `app/src/release/res/values/ads.xml` och fyll i id:n.
   Debug-bygget fortsätter då visa testannonser, release-bygget visar riktiga.
3. Skapa ett GDPR-meddelande i AdMob under Privacy & messaging. Appen visar det automatiskt.
4. Lägg in din telefon som testenhet i AdMob. Klicka aldrig på egna riktiga annonser.
5. Publicera en `app-ads.txt` på webbplatsen du anger i Google Play.

Annonserna visas så här, och går att ändra högst upp i `game.js`:

- Banderoll under brädet, i en egen yta.
- Helskärmsannons var tredje avklarade nivå, tidigast från nivå 6 och högst en per minut.
- Belönad annons ger 2 ledtrådar när de egna är slut.

## Före publicering

- Byt `applicationId` och `namespace` i `app/build.gradle.kts` till ett eget paketnamn. Det går
  inte att ändra efter första uppladdningen.
- Välj målgrupp 13 år och uppåt i Play Console. Riktar du appen till yngre barn gäller
  familjepolicyn, och då krävs annan annonsinställning.
- Fyll i Data safety: annons-SDK:t samlar in enhets-id och ungefärlig plats.
- Appen använder `play-services-ads` (den äldre SDK:n, som Google har satt i underhållsläge).
  Den fungerar, men en flytt till GMA Next-Gen SDK kan bli aktuell längre fram.
- Spelidén, att vrida bitar tills ett nät hänger ihop, är en gammal och vanlig pusselgenre.
  Namn, grafik, nivåer och kod är egna.

## Testversionen utan annonser

`tools/test-apk/` innehåller ett litet Java-skal utan annons-SDK och ett byggskript som inte
behöver Gradle:

    sh tools/test-apk/build.sh /sökväg/till/android.jar

Spelet är detsamma, men där annonserna annars visas syns en platshållare.

## Licenser

Typsnittet Bricolage Grotesque följer SIL Open Font License, se
`licenses/BricolageGrotesque-OFL.txt`.
