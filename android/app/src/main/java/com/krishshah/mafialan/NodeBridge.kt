package com.krishshah.mafialan

object NodeBridge {
    init {
        try {
            System.loadLibrary("node")
            System.loadLibrary("mafia-node-bridge")
        } catch (e: UnsatisfiedLinkError) {
            e.printStackTrace()
        }
    }

    @JvmStatic
    external fun startNodeWithArguments(arguments: Array<String>, nodePath: String?): Int
}
