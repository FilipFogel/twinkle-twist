# Spelet anropar de här metoderna från JavaScript, så de får inte döpas om eller tas bort.
-keepclassmembers class app.ljusslinga.game.GameBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
