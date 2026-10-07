package app.ljusslinga.game

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
 * All AdMob-kod på ett ställe.
 *
 *  - Samtycke (GDPR) hämtas med Googles UMP innan några annonser laddas.
 *  - Banderoll: ligger i en egen yta under spelet.
 *  - Helskärmsannons: visas mellan nivåer när spelet ber om det.
 *  - Belönad annons: ger nya ledtrådar.
 *
 * Spelet får besked tillbaka genom [runJs], som kör JavaScript i WebView:n.
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

    /** Startar samtyckesflödet och därefter annonserna. Anropas en gång från MainActivity. */
    fun start() {
        val params = ConsentRequestParameters.Builder().build()
        consent.requestConsentInfoUpdate(
            activity,
            params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { formError ->
                    if (formError != null) Log.w(TAG, "Samtyckesformulär: ${formError.message}")
                    refreshPrivacyFlag()
                    if (consent.canRequestAds()) initializeAds()
                }
            },
            { error -> Log.w(TAG, "Samtyckesinfo kunde inte hämtas: ${error.message}") }
        )
        // Har spelaren redan svarat en tidigare gång kan annonserna börja laddas direkt.
        refreshPrivacyFlag()
        if (consent.canRequestAds()) initializeAds()
    }

    private fun refreshPrivacyFlag() {
        privacyOptionsRequired = consent.privacyOptionsRequirementStatus ==
            ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
    }

    fun showPrivacyOptions() {
        UserMessagingPlatform.showPrivacyOptionsForm(activity) { formError ->
            if (formError != null) Log.w(TAG, "Integritetsval: ${formError.message}")
            refreshPrivacyFlag()
        }
    }

    private fun initializeAds() {
        if (initialized.getAndSet(true)) return
        // Initiering på en bakgrundstråd, enligt Googles rekommendation, så att starten inte hackar.
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

    // ---------- Banderoll ----------

    private fun loadBanner() {
        val size = bannerSize()
        val view = AdView(activity)
        view.adUnitId = activity.getString(R.string.ad_unit_banner)
        view.setAdSize(size)
        bannerContainer.minimumHeight = size.getHeightInPixels(activity) // reservera plats så att brädet inte hoppar
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

    // ---------- Helskärmsannons ----------

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
                    Log.d(TAG, "Helskärmsannons laddades inte: ${error.message}")
                    handler.postDelayed({ loadInterstitial() }, RETRY_MS)
                }
            }
        )
    }

    fun showInterstitial() {
        val ad = interstitial
        if (ad == null) {
            runJs("window.LS && window.LS.onInterstitialClosed()")
            return
        }
        interstitial = null
        isInterstitialReady = false
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                lastFullScreenAdAt = SystemClock.elapsedRealtime()
                runJs("window.LS && window.LS.onInterstitialClosed()")
                loadInterstitial()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                runJs("window.LS && window.LS.onInterstitialClosed()")
                loadInterstitial()
            }
        }
        ad.show(activity)
    }

    // ---------- Belönad annons ----------

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
                    Log.d(TAG, "Belönad annons laddades inte: ${error.message}")
                    handler.postDelayed({ loadRewarded() }, RETRY_MS)
                }
            }
        )
    }

    /** [kind] är spelets namn på belöningen ("hints") och skickas tillbaka oförändrat. */
    fun showRewarded(kind: String) {
        val safeKind = kind.filter { it.isLetterOrDigit() }
        val ad = rewarded
        if (ad == null) {
            runJs("window.LS && window.LS.onReward('$safeKind', false)")
            return
        }
        rewarded = null
        isRewardedReady = false
        var earned = false
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                lastFullScreenAdAt = SystemClock.elapsedRealtime()
                // Liten marginal ifall belöningsbeskedet kommer strax efter att annonsen stängts.
                handler.postDelayed({
                    if (!destroyed) runJs("window.LS && window.LS.onReward('$safeKind', $earned)")
                }, 250)
                loadRewarded()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                runJs("window.LS && window.LS.onReward('$safeKind', false)")
                loadRewarded()
            }
        }
        ad.show(activity) { earned = true }
    }

    // ---------- Livscykel ----------

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
        const val TAG = "LjusslingaAds"
        const val RETRY_MS = 45_000L   // vänta innan ett nytt laddningsförsök
        const val MIN_GAP_MS = 60_000L // minst så här långt mellan två helskärmsannonser
    }
}
