package app.twinkletwist.game.test;

import android.app.Activity;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;

/**
 * Test shell without the ads SDK: shows the game (assets) in a WebView. Since there is no
 * AndroidBridge, the game shows its placeholders where the ads would otherwise be.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String PREFIX = "/assets/";
    private static final String START_URL = "https://" + HOST + PREFIX + "index.html";
    private static final int BG = 0xFFE6EFFF;

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundResource(R.drawable.bg_gradient);
        webView = new WebView(this);
        root.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);

        // Keep the content clear of the status bar, navigation bar and camera cutout.
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            @SuppressWarnings("deprecation")
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                if (Build.VERSION.SDK_INT >= 30) {
                    Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                    v.setPadding(i.left, i.top, i.right, i.bottom);
                } else {
                    v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                            insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
                }
                return insets;
            }
        });

        webView.setBackgroundColor(BG);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setLongClickable(false); // the game has its own "press and hold" to pin pieces
        webView.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                return true;
            }
        });
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true); // the game's save data (localStorage)
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);

        // The game's files are served locally from assets under an https address. Nothing is fetched from the network.
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String path = url.getPath();
                if (!HOST.equals(url.getHost()) || path == null || !path.startsWith(PREFIX)) return null;
                String name = path.substring(PREFIX.length());
                try {
                    InputStream in = getAssets().open(name);
                    String mime = mimeOf(name);
                    return new WebResourceResponse(mime, mime.startsWith("text/") ? "utf-8" : null, in);
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                            new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost());
            }
        });
        webView.loadUrl(START_URL);
    }

    private static String mimeOf(String name) {
        if (name.endsWith(".html")) return "text/html";
        if (name.endsWith(".css")) return "text/css";
        if (name.endsWith(".js")) return "text/javascript";
        if (name.endsWith(".woff2")) return "font/woff2";
        if (name.endsWith(".svg")) return "image/svg+xml";
        if (name.endsWith(".png")) return "image/png";
        return "application/octet-stream";
    }

    // Back: let the game close dialogs or go to the menu first. Only close the app from the menu.
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        webView.evaluateJavascript("(window.TT && window.TT.onBack()) ? 'handled' : 'exit'", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (value == null || !value.contains("handled")) finish();
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        ViewGroup parent = (ViewGroup) webView.getParent();
        if (parent != null) parent.removeView(webView);
        webView.destroy();
        super.onDestroy();
    }
}
