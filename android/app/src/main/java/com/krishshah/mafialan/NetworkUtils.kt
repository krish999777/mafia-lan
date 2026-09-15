package com.krishshah.mafialan

import android.content.Context
import android.net.wifi.WifiManager
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

object NetworkUtils {

    data class NetworkInfo(
        val ipAddress: String,
        val isHotspot: Boolean,
        val interfaceName: String
    )

    /**
     * Discovers the best IPv4 address for hosting the Mafia LAN game.
     * Prioritizes Hotspot interfaces (ap0, rndis0, wlan1), then Wi-Fi (wlan0), then any valid LAN IPv4.
     */
    fun getLocalIpAddress(context: Context): NetworkInfo {
        var wifiIp: String? = null
        var hotspotIp: String? = null
        var fallbackIp: String? = null

        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces) {
                if (!intf.isUp || intf.isLoopback) continue

                val addrs = Collections.list(intf.inetAddresses)
                for (addr in addrs) {
                    if (addr is Inet4Address && !addr.isLoopbackAddress) {
                        val host = addr.hostAddress ?: continue
                        val name = intf.name.lowercase()

                        // Common hotspot / tethering interface names on Android: ap0, softap, rndis, wlan1
                        if (name.contains("ap") || name.contains("rndis") || host.startsWith("192.168.43.")) {
                            hotspotIp = host
                            return NetworkInfo(host, isHotspot = true, interfaceName = intf.name)
                        } else if (name.contains("wlan") || name.contains("eth")) {
                            wifiIp = host
                        } else {
                            fallbackIp = host
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        if (hotspotIp != null) {
            return NetworkInfo(hotspotIp, isHotspot = true, interfaceName = "hotspot")
        }
        if (wifiIp != null) {
            return NetworkInfo(wifiIp, isHotspot = false, interfaceName = "wifi")
        }
        if (fallbackIp != null) {
            return NetworkInfo(fallbackIp, isHotspot = false, interfaceName = "lan")
        }

        // Fallback to WifiManager if available
        try {
            val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val ipInt = wm?.connectionInfo?.ipAddress ?: 0
            if (ipInt != 0) {
                val ip = String.format(
                    "%d.%d.%d.%d",
                    ipInt and 0xff,
                    ipInt shr 8 and 0xff,
                    ipInt shr 16 and 0xff,
                    ipInt shr 24 and 0xff
                )
                return NetworkInfo(ip, isHotspot = false, interfaceName = "wlan0")
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return NetworkInfo("127.0.0.1", isHotspot = false, interfaceName = "loopback")
    }
}
