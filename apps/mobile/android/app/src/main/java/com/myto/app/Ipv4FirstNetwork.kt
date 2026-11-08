package com.myto.app

import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import java.net.Inet4Address
import java.util.concurrent.TimeUnit
import okhttp3.Dns

/**
 * React Native's network client has no connect timeout and tries a host's IPv6 address first, with no fallback. On a connection where IPv6
 * is announced but its TCP never gets through (the trail photos on Cloudflare then hang forever, while a browser, which falls back, loads
 * them), that leaves every image and request stuck. This tries IPv4 addresses first and gives up on a connection after ten seconds, so the
 * next address is tried.
 */
object Ipv4FirstNetwork {
  fun install() {
    OkHttpClientProvider.setOkHttpClientFactory(
      OkHttpClientFactory {
        OkHttpClientProvider.createClientBuilder()
          .dns(object : Dns {
            override fun lookup(hostname: String) = Dns.SYSTEM.lookup(hostname).sortedBy { if (it is Inet4Address) 0 else 1 }
          })
          .connectTimeout(10, TimeUnit.SECONDS)
          .build()
      }
    )
  }
}
