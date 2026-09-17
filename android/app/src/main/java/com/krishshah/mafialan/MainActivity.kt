package com.krishshah.mafialan

import android.Manifest
import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    private lateinit var tvStatus: TextView
    private lateinit var tvNetworkType: TextView
    private lateinit var tvGameUrl: TextView
    private lateinit var statusDot: View
    private lateinit var btnStartServer: Button
    private lateinit var btnStopServer: Button
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
    private var isServerOnline: Boolean = false
    private var isTransitioning: Boolean = false
    private var healthCheckJob: Job? = null

    private val serverStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == MafiaServerService.ACTION_STATE_CHANGED) {
                val running = intent.getBooleanExtra(MafiaServerService.EXTRA_IS_RUNNING, false)
                val url = intent.getStringExtra(MafiaServerService.EXTRA_SERVER_URL)
                if (url != null && running) {
                    currentGameUrl = url
                    tvGameUrl.text = url
                }
                if (!isTransitioning) {
                    updateServerUi(running)
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        initViews()
        requestNotificationPermission()
        setupWebView()
        setupClickListeners()
        setupBackHandler()

        // Register broadcast listener for server service notifications
        val filter = IntentFilter(MafiaServerService.ACTION_STATE_CHANGED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(serverStateReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(serverStateReceiver, filter)
        }

        // Initial check without auto-starting server
        updateNetworkDisplay()
        updateServerUi(false)
        startPeriodicHealthCheck()
    }

    override fun onResume() {
        super.onResume()
        updateNetworkDisplay()
        // Quick probe to check if server is already running in background
        checkHealthOnce()
    }

    override fun onDestroy() {
        healthCheckJob?.cancel()
        try {
            unregisterReceiver(serverStateReceiver)
        } catch (_: Exception) {}
        super.onDestroy()
    }

    private fun initViews() {
        tvStatus = findViewById(R.id.tvStatus)
        tvNetworkType = findViewById(R.id.tvNetworkType)
        tvGameUrl = findViewById(R.id.tvGameUrl)
        statusDot = findViewById(R.id.statusDot)
        btnStartServer = findViewById(R.id.btnStartServer)
        btnStopServer = findViewById(R.id.btnStopServer)
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
        btnStartServer.setOnClickListener {
            handleStartServer()
        }

        btnStopServer.setOnClickListener {
            handleStopServer()
        }

        btnRestartServer.setOnClickListener {
            handleRestartServer()
        }

        btnCopyLink.setOnClickListener {
            if (!isServerOnline) {
                Toast.makeText(this, "⚠️ Server is offline. Tap 'Start Server' first!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            copyToClipboard(currentGameUrl)
        }

        btnOpenChrome.setOnClickListener {
            if (!isServerOnline) {
                Toast.makeText(this, "⚠️ Server is offline. Tap 'Start Server' first!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            openInExternalBrowser(currentGameUrl)
        }

        btnPlayInApp.setOnClickListener {
            if (!isServerOnline) {
                Toast.makeText(this, "⚠️ Server is offline. Tap 'Start Server' first!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            openInAppGame(currentGameUrl)
        }

        btnShareLink.setOnClickListener {
            if (!isServerOnline) {
                Toast.makeText(this, "⚠️ Server is offline. Tap 'Start Server' first!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            shareGameLink(currentGameUrl)
        }

        btnCloseWebView.setOnClickListener {
            inAppWebViewContainer.visibility = View.GONE
            dashboardLayout.visibility = View.VISIBLE
        }

        btnReloadWebView.setOnClickListener {
            gameWebView.clearCache(true)
            gameWebView.reload()
        }
    }

    private fun handleStartServer() {
        if (isTransitioning || isServerOnline) return
        isTransitioning = true

        tvStatus.text = getString(R.string.server_status_starting)
        tvStatus.setTextColor(ContextCompat.getColor(this, R.color.warning_amber))
        statusDot.alpha = 0.5f
        btnStartServer.isEnabled = false

        updateNetworkDisplay()
        MafiaServerService.start(this)

        lifecycleScope.launch {
            var online = false
            for (i in 1..25) { // Poll for up to 12.5 seconds
                delay(500)
                if (checkServerHealth()) {
                    online = true
                    break
                }
            }

            isTransitioning = false
            updateServerUi(online)

            if (online) {
                Toast.makeText(this@MainActivity, "🕵️ Mafia LAN Server is ONLINE!", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this@MainActivity, "❌ Failed to start server. Please check permissions and retry.", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun handleStopServer() {
        if (isTransitioning || !isServerOnline) return
        isTransitioning = true

        tvStatus.text = getString(R.string.server_status_stopping)
        tvStatus.setTextColor(ContextCompat.getColor(this, R.color.warning_amber))
        statusDot.alpha = 0.5f
        btnStopServer.isEnabled = false

        MafiaServerService.stop(this)

        lifecycleScope.launch {
            // Wait for port to close
            for (i in 1..10) {
                delay(300)
                if (!checkServerHealth()) break
            }

            isTransitioning = false
            updateServerUi(false)
            Toast.makeText(this@MainActivity, "Server stopped.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun handleRestartServer() {
        if (isTransitioning) return
        isTransitioning = true

        tvStatus.text = "RESTARTING SERVER..."
        tvStatus.setTextColor(ContextCompat.getColor(this, R.color.warning_amber))
        statusDot.alpha = 0.5f
        btnStartServer.isEnabled = false
        btnStopServer.isEnabled = false

        MafiaServerService.stop(this)

        dashboardLayout.postDelayed({
            updateNetworkDisplay()
            MafiaServerService.start(this)

            lifecycleScope.launch {
                var online = false
                for (i in 1..25) {
                    delay(500)
                    if (checkServerHealth()) {
                        online = true
                        break
                    }
                }

                isTransitioning = false
                updateServerUi(online)
                if (online) {
                    Toast.makeText(this@MainActivity, "Server restarted successfully!", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@MainActivity, "Failed to restart server.", Toast.LENGTH_SHORT).show()
                }
            }
        }, 1000)
    }

    private fun updateServerUi(online: Boolean) {
        isServerOnline = online

        if (online) {
            tvStatus.text = getString(R.string.server_status_online)
            tvStatus.setTextColor(ContextCompat.getColor(this, R.color.online_green))
            statusDot.alpha = 1.0f
            btnStartServer.visibility = View.GONE
            btnStopServer.visibility = View.VISIBLE
            btnStopServer.isEnabled = true
            btnCopyLink.alpha = 1.0f
            btnOpenChrome.alpha = 1.0f
            btnPlayInApp.alpha = 1.0f
            btnShareLink.alpha = 1.0f
        } else {
            tvStatus.text = getString(R.string.server_status_offline)
            tvStatus.setTextColor(ContextCompat.getColor(this, R.color.text_secondary))
            statusDot.alpha = 0.25f
            btnStopServer.visibility = View.GONE
            btnStartServer.visibility = View.VISIBLE
            btnStartServer.isEnabled = true
            btnCopyLink.alpha = 0.65f
            btnOpenChrome.alpha = 0.65f
            btnPlayInApp.alpha = 0.65f
            btnShareLink.alpha = 0.65f
        }
    }

    private fun startPeriodicHealthCheck() {
        healthCheckJob?.cancel()
        healthCheckJob = lifecycleScope.launch {
            while (isActive) {
                delay(3000)
                if (!isTransitioning) {
                    val healthy = checkServerHealth()
                    if (healthy != isServerOnline) {
                        updateServerUi(healthy)
                    }
                }
            }
        }
    }

    private fun checkHealthOnce() {
        lifecycleScope.launch {
            if (!isTransitioning) {
                val healthy = checkServerHealth()
                updateServerUi(healthy)
            }
        }
    }

    private suspend fun checkServerHealth(): Boolean = withContext(Dispatchers.IO) {
        try {
            val url = URL("http://127.0.0.1:3000/api/health")
            val connection = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 1000
                readTimeout = 1000
                requestMethod = "GET"
                instanceFollowRedirects = false
                useCaches = false
            }
            val responseCode = connection.responseCode
            connection.disconnect()
            responseCode == 200
        } catch (_: Exception) {
            false
        }
    }

    private fun setupWebView() {
        val settings = gameWebView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.cacheMode = WebSettings.LOAD_NO_CACHE
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
        gameWebView.clearCache(true)
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
