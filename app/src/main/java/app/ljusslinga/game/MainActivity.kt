package app.ljusslinga.game

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
 * Appens enda skärm. Spelet är skrivet i HTML/JavaScript (mappen assets) och körs i en WebView.
 * Android-delen sköter det som kräver riktig app: annonser, samtycke, vibration och bakåt-knappen.
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

        // Håll innehållet undan från statusfält, navigeringsfält och kamerahål.
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
        webView.isLongClickable = false // spelet har ett eget "håll inne" för att nåla fast bitar
        webView.setOnLongClickListener { true }
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true // spelets sparning (localStorage)
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            textZoom = 100 // systemets textstorlek ska inte spräcka brädet
        }

        // Spelets filer serveras lokalt från assets under en https-adress. Inget hämtas från nätet.
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
                // Eventuella externa länkar öppnas i webbläsaren, aldrig inne i spelet.
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, request.url))
                } catch (e: Exception) {
                    // ingen app kan öppna länken
                }
                return true
            }
        }

        ads = AdsManager(this, findViewById<FrameLayout>(R.id.ad_container)) { script ->
            webView.evaluateJavascript(script, null)
        }
        webView.addJavascriptInterface(GameBridge(this, webView, ads), "AndroidBridge")
        webView.loadUrl(START_URL)

        // Bakåt: låt spelet stänga dialoger eller gå till menyn först. Stäng appen först från menyn.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript("(window.LS && window.LS.onBack()) ? 'handled' : 'exit'") { result ->
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
