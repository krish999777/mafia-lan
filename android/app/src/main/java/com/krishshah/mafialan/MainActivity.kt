package com.krishshah.mafialan

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var tvStatus: TextView
    private lateinit var tvNetworkType: TextView
    private lateinit var tvGameUrl: TextView
    private lateinit var statusDot: View
    private lateinit var btnCopyLink: Button
    private lateinit var btnOpenChrome: Button
    private lateinit var btnPlayInApp: Button
    private lateinit var btnShareLink: Button
    private lateinit var btnRestartServer: Button

    private lateinit var dashboardLayout: View
    private lateinit var inAppWebViewContainer: View
    private lateinit var gameWebView: WebView
    private lateinit var btnCloseWebView: Button
    private lateinit var btnReloadWebView: Button

    private var currentGameUrl: String = "http://127.0.0.1:3000"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        initViews()
        requestNotificationPermission()
        setupWebView()
        setupClickListeners()
        setupBackHandler()

        // Start server service
        MafiaServerService.start(this)

        observeServerState()
    }

    override fun onResume() {
        super.onResume()
        updateNetworkDisplay()
    }

    private fun initViews() {
        tvStatus = findViewById(R.id.tvStatus)
        tvNetworkType = findViewById(R.id.tvNetworkType)
        tvGameUrl = findViewById(R.id.tvGameUrl)
        statusDot = findViewById(R.id.statusDot)
        btnCopyLink = findViewById(R.id.btnCopyLink)
        btnOpenChrome = findViewById(R.id.btnOpenChrome)
        btnPlayInApp = findViewById(R.id.btnPlayInApp)
        btnShareLink = findViewById(R.id.btnShareLink)
        btnRestartServer = findViewById(R.id.btnRestartServer)

        dashboardLayout = findViewById(R.id.dashboardLayout)
        inAppWebViewContainer = findViewById(R.id.inAppWebViewContainer)
        gameWebView = findViewById(R.id.gameWebView)
        btnCloseWebView = findViewById(R.id.btnCloseWebView)
        btnReloadWebView = findViewById(R.id.btnReloadWebView)
    }

    private fun setupClickListeners() {
        btnCopyLink.setOnClickListener {
            copyToClipboard(currentGameUrl)
        }

        btnOpenChrome.setOnClickListener {
            openInExternalBrowser(currentGameUrl)
        }

        btnPlayInApp.setOnClickListener {
            openInAppGame(currentGameUrl)
        }

        btnShareLink.setOnClickListener {
            shareGameLink(currentGameUrl)
        }

        btnRestartServer.setOnClickListener {
            Toast.makeText(this, "Restarting server...", Toast.LENGTH_SHORT).show()
            MafiaServerService.stop(this)
            tvStatus.text = getString(R.string.server_status_starting)
            statusDot.alpha = 0.4f
            dashboardLayout.postDelayed({
                MafiaServerService.start(this)
            }, 1000)
        }

        btnCloseWebView.setOnClickListener {
            inAppWebViewContainer.visibility = View.GONE
            dashboardLayout.visibility = View.VISIBLE
        }

        btnReloadWebView.setOnClickListener {
            gameWebView.reload()
        }
    }

    private fun setupWebView() {
        val settings = gameWebView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        gameWebView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                return false // load inside webview
            }
        }
        gameWebView.webChromeClient = WebChromeClient()
    }

    private fun setupBackHandler() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (inAppWebViewContainer.visibility == View.VISIBLE) {
                    if (gameWebView.canGoBack()) {
                        gameWebView.goBack()
                    } else {
                        inAppWebViewContainer.visibility = View.GONE
                        dashboardLayout.visibility = View.VISIBLE
                    }
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun observeServerState() {
        lifecycleScope.launch {
            MafiaServerService.isRunning.collectLatest { running ->
                if (running) {
                    tvStatus.text = getString(R.string.server_status_online)
                    statusDot.alpha = 1.0f
                } else {
                    tvStatus.text = getString(R.string.server_status_offline)
                    statusDot.alpha = 0.3f
                }
            }
        }

        lifecycleScope.launch {
            MafiaServerService.serverUrl.collectLatest { url ->
                currentGameUrl = url
                tvGameUrl.text = url
            }
        }
    }

    private fun updateNetworkDisplay() {
        val netInfo = NetworkUtils.getLocalIpAddress(this)
        tvNetworkType.text = if (netInfo.isHotspot) "HOTSPOT (${netInfo.interfaceName})" else "WI-FI (${netInfo.interfaceName})"
        val url = "http://${netInfo.ipAddress}:3000"
        currentGameUrl = url
        tvGameUrl.text = url
    }

    private fun copyToClipboard(url: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Mafia LAN URL", url)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(this, "Copied $url to clipboard! Share with players.", Toast.LENGTH_LONG).show()
    }

    private fun openInExternalBrowser(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, "Cannot open browser: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun openInAppGame(url: String) {
        dashboardLayout.visibility = View.GONE
        inAppWebViewContainer.visibility = View.VISIBLE
        // Use 127.0.0.1 for in-app webview for minimum latency and direct loopback
        val webViewUrl = "http://127.0.0.1:3000"
        gameWebView.loadUrl(webViewUrl)
    }

    private fun shareGameLink(url: String) {
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "Join Mafia LAN Game")
            putExtra(Intent.EXTRA_TEXT, "Join my Mafia LAN game on our Wi-Fi/Hotspot:\n$url")
        }
        startActivity(Intent.createChooser(shareIntent, "Share Mafia Game Link"))
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 101)
            }
        }
    }
}
