# The game calls these methods from JavaScript, so they must not be renamed or removed.
-keepclassmembers class app.twinkletwist.game.GameBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
