package com.krishshah.mafialan

import android.util.Log

object NodeBridge {
    private const val TAG = "NodeBridge"
    var isLoaded: Boolean = false
        private set

    fun load(): Boolean {
        if (isLoaded) return true
        return try {
            System.loadLibrary("c++_shared")
            System.loadLibrary("node")
            System.loadLibrary("mafia-node-bridge")
            isLoaded = true
            Log.i(TAG, "Successfully loaded native libraries: c++_shared, node, mafia-node-bridge")
            true
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "UnsatisfiedLinkError while loading native libraries", e)
            false
        } catch (e: Throwable) {
            Log.e(TAG, "Unexpected error loading native libraries", e)
            false
        }
    }

    init {
        load()
    }

    @JvmStatic
    external fun startNodeWithArguments(arguments: Array<String>, nodePath: String?): Int
}
