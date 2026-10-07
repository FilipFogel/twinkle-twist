package app.twinkletwist.game

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.widget.FrameLayout
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import java.util.concurrent.atomic.AtomicBoolean

/**
 * All AdMob code in one place.
 *
 *  - Consent (GDPR) is gathered with Google's UMP before any ads are loaded.
 *  - Banner: sits in its own area below the game.
 *  - Interstitial: shown between levels when the game asks for it.
 *  - Rewarded ad: grants new hints.
 *
 * The game gets results back through [runJs], which runs JavaScript in the WebView.
 */
class AdsManager(
    private val activity: Activity,
    private val bannerContainer: FrameLayout,
    private val runJs: (String) -> Unit
) {

    private val consent: ConsentInformation = UserMessagingPlatform.getConsentInformation(activity)
    private val initialized = AtomicBoolean(false)
    private val handler = Handler(Looper.getMainLooper())

    private var banner: AdView? = null
    private var interstitial: InterstitialAd? = null
    private var rewarded: RewardedAd? = null
    private var loadingInterstitial = false
    private var loadingRewarded = false
    private var lastFullScreenAdAt = 0L
    private var destroyed = false

    @Volatile
    var isRewardedReady = false
        private set

    @Volatile
    private var isInterstitialReady = false

    @Volatile
    var privacyOptionsRequired = false
        private set

    /** Starts the consent flow and then the ads. Called once from MainActivity. */
    fun start() {
        val params = ConsentRequestParameters.Builder().build()
        consent.requestConsentInfoUpdate(
            activity,
            params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { formError ->
                    if (formError != null) Log.w(TAG, "Consent form: ${formError.message}")
                    refreshPrivacyFlag()
                    if (consent.canRequestAds()) initializeAds()
                }
            },
            { error -> Log.w(TAG, "Could not fetch consent info: ${error.message}") }
        )
        // If the player already answered on an earlier launch, ads can start loading right away.
        refreshPrivacyFlag()
        if (consent.canRequestAds()) initializeAds()
    }

    private fun refreshPrivacyFlag() {
        privacyOptionsRequired = consent.privacyOptionsRequirementStatus ==
            ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
    }

    fun showPrivacyOptions() {
        UserMessagingPlatform.showPrivacyOptionsForm(activity) { formError ->
            if (formError != null) Log.w(TAG, "Privacy options: ${formError.message}")
            refreshPrivacyFlag()
        }
    }

    private fun initializeAds() {
        if (initialized.getAndSet(true)) return
        // Initialize on a background thread, as Google recommends, so startup does not stutter.
        Thread {
            MobileAds.initialize(activity) {}
            activity.runOnUiThread {
                if (destroyed) return@runOnUiThread
                loadBanner()
                loadInterstitial()
                loadRewarded()
            }
        }.start()
    }

    // ---------- Banner ----------

    private fun loadBanner() {
        val size = bannerSize()
        val view = AdView(activity)
        view.adUnitId = activity.getString(R.string.ad_unit_banner)
        view.setAdSize(size)
        bannerContainer.minimumHeight = size.getHeightInPixels(activity) // reserve space so the board does not jump
        bannerContainer.removeAllViews()
        bannerContainer.addView(view)
        view.loadAd(AdRequest.Builder().build())
        banner = view
    }

    @Suppress("DEPRECATION")
    private fun bannerSize(): AdSize {
        val metrics = activity.resources.displayMetrics
        val widthPx = if (bannerContainer.width > 0) bannerContainer.width else metrics.widthPixels
        val widthDp = (widthPx / metrics.density).toInt()
        return AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, widthDp)
    }

    // ---------- Interstitial ----------

    fun canShowInterstitial(): Boolean =
        isInterstitialReady && SystemClock.elapsedRealtime() - lastFullScreenAdAt > MIN_GAP_MS

    private fun loadInterstitial() {
        if (destroyed || loadingInterstitial || interstitial != null) return
        loadingInterstitial = true
        InterstitialAd.load(
            activity,
            activity.getString(R.string.ad_unit_interstitial),
            AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    loadingInterstitial = false
                    interstitial = ad
                    isInterstitialReady = true
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    loadingInterstitial = false
                    Log.d(TAG, "Interstitial failed to load: ${error.message}")
                    handler.postDelayed({ loadInterstitial() }, RETRY_MS)
                }
            }
        )
    }

    fun showInterstitial() {
        val ad = interstitial
        if (ad == null) {
            runJs("window.TT && window.TT.onInterstitialClosed()")
            return
        }
        interstitial = null
        isInterstitialReady = false
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                lastFullScreenAdAt = SystemClock.elapsedRealtime()
                runJs("window.TT && window.TT.onInterstitialClosed()")
                loadInterstitial()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                runJs("window.TT && window.TT.onInterstitialClosed()")
                loadInterstitial()
            }
        }
        ad.show(activity)
    }

    // ---------- Rewarded ad ----------

    private fun loadRewarded() {
        if (destroyed || loadingRewarded || rewarded != null) return
        loadingRewarded = true
        RewardedAd.load(
            activity,
            activity.getString(R.string.ad_unit_rewarded),
            AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    loadingRewarded = false
                    rewarded = ad
                    isRewardedReady = true
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    loadingRewarded = false
                    Log.d(TAG, "Rewarded ad failed to load: ${error.message}")
                    handler.postDelayed({ loadRewarded() }, RETRY_MS)
                }
            }
        )
    }

    /** [kind] is the game's name for the reward ("hints") and is passed back unchanged. */
    fun showRewarded(kind: String) {
        val safeKind = kind.filter { it.isLetterOrDigit() }
        val ad = rewarded
        if (ad == null) {
            runJs("window.TT && window.TT.onReward('$safeKind', false)")
            return
        }
        rewarded = null
        isRewardedReady = false
        var earned = false
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                lastFullScreenAdAt = SystemClock.elapsedRealtime()
                // Small margin in case the reward callback arrives just after the ad is closed.
                handler.postDelayed({
                    if (!destroyed) runJs("window.TT && window.TT.onReward('$safeKind', $earned)")
                }, 250)
                loadRewarded()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                runJs("window.TT && window.TT.onReward('$safeKind', false)")
                loadRewarded()
            }
        }
        ad.show(activity) { earned = true }
    }

    // ---------- Lifecycle ----------

    fun onResume() {
        banner?.resume()
    }

    fun onPause() {
        banner?.pause()
    }

    fun onDestroy() {
        destroyed = true
        handler.removeCallbacksAndMessages(null)
        banner?.destroy()
        banner = null
        interstitial = null
        rewarded = null
    }

    private companion object {
        const val TAG = "TwinkleTwistAds"
        const val RETRY_MS = 45_000L   // wait before another load attempt
        const val MIN_GAP_MS = 60_000L // at least this long between two full-screen ads
    }
}
