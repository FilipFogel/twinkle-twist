package app.twinkletwist.game

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.view.HapticFeedbackConstants
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.android.play.core.review.ReviewManagerFactory

/**
 * The bridge between the game (JavaScript) and the app. Visible in the game as window.AndroidBridge.
 * The methods are called on a background thread, so anything touching the screen is posted to the UI thread.
 */
class GameBridge(
    private val activity: Activity,
    private val webView: WebView,
    private val ads: AdsManager
) {

    /** Shows a rewarded ad. Returns false right away if no ad is loaded. */
    @JavascriptInterface
    fun showRewarded(kind: String): Boolean {
        if (!ads.isRewardedReady) return false
        activity.runOnUiThread { ads.showRewarded(kind) }
        return true
    }

    /** Shows an interstitial between levels. Returns false if now is not a good time for one. */
    @JavascriptInterface
    fun showInterstitial(): Boolean {
        if (!ads.canShowInterstitial()) return false
        activity.runOnUiThread { ads.showInterstitial() }
        return true
    }

    /** True if the player must be able to change their ad consent (EU/EEA and others). */
    @JavascriptInterface
    fun privacyOptionsRequired(): Boolean = ads.privacyOptionsRequired

    @JavascriptInterface
    fun showPrivacyOptions() {
        activity.runOnUiThread { ads.showPrivacyOptions() }
    }

    /** Short vibration: "tap", "ok" or "bad". Needs no permission. */
    @JavascriptInterface
    fun haptic(kind: String) {
        val constant = when (kind) {
            "ok" -> if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY
            "bad" -> if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS
            else -> HapticFeedbackConstants.CLOCK_TICK
        }
        activity.runOnUiThread { webView.performHapticFeedback(constant) }
    }

    /** Opens the system share sheet with a ready-made text, such as the result of the daily string. */
    @JavascriptInterface
    fun share(text: String) {
        activity.runOnUiThread {
            val send = Intent(Intent.ACTION_SEND)
                .setType("text/plain")
                .putExtra(Intent.EXTRA_TEXT, text)
            try {
                activity.startActivity(Intent.createChooser(send, null))
            } catch (e: Exception) {
                // no app can receive text
            }
        }
    }

    /**
     * Asks Google Play to show its rating dialog. Play decides on its own whether the dialog really
     * appears (there is a quota), and it never tells the app what the player answered. Outside
     * Google Play, for example in a debug build, nothing happens.
     */
    @JavascriptInterface
    fun askReview() {
        activity.runOnUiThread {
            val manager = ReviewManagerFactory.create(activity)
            manager.requestReviewFlow().addOnCompleteListener { request ->
                if (request.isSuccessful && !activity.isFinishing && !activity.isDestroyed) {
                    manager.launchReviewFlow(activity, request.result)
                }
            }
        }
    }
}
