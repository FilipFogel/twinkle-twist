package app.twinkletwist.game

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat

/**
 * The app's only screen. The game is written in HTML/JavaScript (the assets folder) and runs in a WebView.
 * The Android side handles what needs a real app: ads, consent, vibration and the back button.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var ads: AdsManager

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT)
        )
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Keep the content clear of the status bar, navigation bar and camera cutout.
        val root = findViewById<View>(R.id.root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            view.updatePadding(left = bars.left, top = bars.top, right = bars.right, bottom = bars.bottom)
            WindowInsetsCompat.CONSUMED
        }

        webView = findViewById(R.id.web)
        webView.setBackgroundColor(getColor(R.color.bg_top))
        webView.isVerticalScrollBarEnabled = false
        webView.isHorizontalScrollBarEnabled = false
        webView.overScrollMode = View.OVER_SCROLL_NEVER
        webView.isHapticFeedbackEnabled = true
        webView.isLongClickable = false // the game has its own "press and hold" to pin pieces
        webView.setOnLongClickListener { true }
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true // the game's save data (localStorage)
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            textZoom = 100 // the system text size must not break the board
        }

        // The game's files are served locally from assets under an https address. Nothing is fetched from the network.
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == WebViewAssetLoader.DEFAULT_DOMAIN) return false
                // Any external links open in the browser, never inside the game.
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, request.url))
                } catch (e: Exception) {
                    // no app can open the link
                }
                return true
            }
        }

        ads = AdsManager(this, findViewById<FrameLayout>(R.id.ad_container)) { script ->
            webView.evaluateJavascript(script, null)
        }
        webView.addJavascriptInterface(GameBridge(this, webView, ads), "AndroidBridge")
        webView.loadUrl(START_URL)

        // Back: let the game close dialogs or go to the menu first. Only close the app from the menu.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript("(window.TT && window.TT.onBack()) ? 'handled' : 'exit'") { result ->
                    if (result == null || !result.contains("handled")) finish()
                }
            }
        })

        ads.start()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        ads.onResume()
    }

    override fun onPause() {
        ads.onPause()
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        ads.onDestroy()
        (webView.parent as? ViewGroup)?.removeView(webView)
        webView.destroy()
        super.onDestroy()
    }

    private companion object {
        const val START_URL = "https://appassets.androidplatform.net/assets/index.html"
    }
}
