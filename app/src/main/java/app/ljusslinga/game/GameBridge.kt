package app.ljusslinga.game

import android.app.Activity
import android.os.Build
import android.view.HapticFeedbackConstants
import android.webkit.JavascriptInterface
import android.webkit.WebView

/**
 * Bryggan mellan spelet (JavaScript) och appen. Syns i spelet som window.AndroidBridge.
 * Metoderna anropas på en bakgrundstråd, så allt som rör skärmen skickas vidare till UI-tråden.
 */
class GameBridge(
    private val activity: Activity,
    private val webView: WebView,
    private val ads: AdsManager
) {

    /** Visar en belönad annons. Svarar false direkt om ingen annons är laddad. */
    @JavascriptInterface
    fun showRewarded(kind: String): Boolean {
        if (!ads.isRewardedReady) return false
        activity.runOnUiThread { ads.showRewarded(kind) }
        return true
    }

    /** Visar en helskärmsannons mellan nivåer. Svarar false om det inte är läge för en. */
    @JavascriptInterface
    fun showInterstitial(): Boolean {
        if (!ads.canShowInterstitial()) return false
        activity.runOnUiThread { ads.showInterstitial() }
        return true
    }

    /** True om spelaren måste kunna ändra sitt annonssamtycke (EU/EES m.fl.). */
    @JavascriptInterface
    fun privacyOptionsRequired(): Boolean = ads.privacyOptionsRequired

    @JavascriptInterface
    fun showPrivacyOptions() {
        activity.runOnUiThread { ads.showPrivacyOptions() }
    }

    /** Kort vibration: "tap", "ok" eller "bad". Kräver ingen behörighet. */
    @JavascriptInterface
    fun haptic(kind: String) {
        val constant = when (kind) {
            "ok" -> if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY
            "bad" -> if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS
            else -> HapticFeedbackConstants.CLOCK_TICK
        }
        activity.runOnUiThread { webView.performHapticFeedback(constant) }
    }
}
