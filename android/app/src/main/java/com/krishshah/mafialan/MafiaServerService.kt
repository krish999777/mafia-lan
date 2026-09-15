package com.krishshah.mafialan

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import kotlin.concurrent.thread

class MafiaServerService : Service() {

    companion object {
        private const val TAG = "MafiaServerService"
        const val CHANNEL_ID = "mafia_server_service_channel"
        const val NOTIFICATION_ID = 777

        const val ACTION_START = "com.krishshah.mafialan.ACTION_START"
        const val ACTION_STOP = "com.krishshah.mafialan.ACTION_STOP"

        private val _isRunning = MutableStateFlow(false)
        val isRunning: StateFlow<Boolean> = _isRunning

        private val _serverUrl = MutableStateFlow("http://127.0.0.1:3000")
        val serverUrl: StateFlow<String> = _serverUrl

        fun start(context: Context) {
            val intent = Intent(context, MafiaServerService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, MafiaServerService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null
    private var nodeThread: Thread? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopServer()
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_START, null -> {
                startServer()
            }
        }
        return START_STICKY
    }

    private fun startServer() {
        if (_isRunning.value) return

        val netInfo = NetworkUtils.getLocalIpAddress(this)
        val url = "http://${netInfo.ipAddress}:3000"
        _serverUrl.value = url

        startForegroundWithNotification(url)
        acquireLocks()

        _isRunning.value = true

        nodeThread = thread(name = "NodeServerThread") {
            try {
                val serverDir = extractServerAssetsIfNeeded()
                val mainScript = File(serverDir, "main.js")
                Log.i(TAG, "Starting Node.js server with entry: ${mainScript.absolutePath}")

                val args = arrayOf(
                    "node",
                    mainScript.absolutePath
                )
                val exitCode = NodeBridge.startNodeWithArguments(args, serverDir.absolutePath)
                Log.i(TAG, "Node.js exited with code: $exitCode")
            } catch (t: Throwable) {
                Log.e(TAG, "Error running Node server", t)
            } finally {
                _isRunning.value = false
            }
        }
    }

    private fun stopServer() {
        releaseLocks()
        _isRunning.value = false
        // Node process termination if running
        nodeThread?.interrupt()
        nodeThread = null
    }

    private fun acquireLocks() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = powerManager?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MafiaLAN::ServerWakeLock")?.apply {
                acquire(10 * 60 * 60 * 1000L) // 10 hours
            }

            val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            wifiLock = wifiManager?.createWifiLock(
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    WifiManager.WIFI_MODE_FULL_LOW_LATENCY
                } else {
                    @Suppress("DEPRECATION")
                    WifiManager.WIFI_MODE_FULL_HIGH_PERF
                },
                "MafiaLAN::ServerWifiLock"
            )?.apply {
                acquire()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to acquire wake/wifi locks", e)
        }
    }

    private fun releaseLocks() {
        try {
            wakeLock?.let {
                if (it.isHeld) it.release()
            }
            wakeLock = null

            wifiLock?.let {
                if (it.isHeld) it.release()
            }
            wifiLock = null
        } catch (e: Exception) {
            Log.w(TAG, "Failed to release wake/wifi locks", e)
        }
    }

    private fun extractServerAssetsIfNeeded(): File {
        val serverDir = File(filesDir, "server")
        if (!serverDir.exists()) {
            serverDir.mkdirs()
        }

        // Always copy assets to ensure updates/bundling are fresh
        copyAssetDirectory("server", serverDir)
        return serverDir
    }

    private fun copyAssetDirectory(assetSubDir: String, targetDir: File) {
        val assetList = assets.list(assetSubDir) ?: return
        if (!targetDir.exists()) {
            targetDir.mkdirs()
        }

        for (item in assetList) {
            val itemPath = if (assetSubDir.isEmpty()) item else "$assetSubDir/$item"
            val children = assets.list(itemPath)

            if (!children.isNullOrEmpty()) {
                // Directory
                val childTarget = File(targetDir, item)
                copyAssetDirectory(itemPath, childTarget)
            } else {
                // File
                val targetFile = File(targetDir, item)
                // Overwrite if size differs or not exists
                copyAssetFile(itemPath, targetFile)
            }
        }
    }

    private fun copyAssetFile(assetPath: String, targetFile: File) {
        var inputStream: InputStream? = null
        var outputStream: FileOutputStream? = null
        try {
            inputStream = assets.open(assetPath)
            outputStream = FileOutputStream(targetFile)
            val buffer = ByteArray(8192)
            var read: Int
            while (inputStream.read(buffer).also { read = it } != -1) {
                outputStream.write(buffer, 0, read)
            }
            outputStream.flush()
        } catch (e: Exception) {
            Log.e(TAG, "Error copying asset file: $assetPath", e)
        } finally {
            try { inputStream?.close() } catch (_: Exception) {}
            try { outputStream?.close() } catch (_: Exception) {}
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Mafia LAN Server",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the Mafia LAN game server running in background"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun startForegroundWithNotification(url: String) {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Mafia LAN Server Running")
            .setContentText("Game live at $url")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    override fun onDestroy() {
        stopServer()
        super.onDestroy()
    }
}
