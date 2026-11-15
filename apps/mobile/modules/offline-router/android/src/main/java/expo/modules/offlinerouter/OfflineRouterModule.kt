package expo.modules.offlinerouter

import android.content.Context
import com.valhalla.valhalla.Valhalla
import com.valhalla.valhalla.config.ValhallaConfigFactory
import com.valhalla.valhalla.config.ValhallaConfigManager
import com.valhalla.valhalla.files.ValhallaFile
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.zip.GZIPInputStream

/** The app passes `file://` URIs (expo-file-system's form); files want plain paths. */
private fun plainPath(p: String): String = if (p.startsWith("file://")) android.net.Uri.parse(p).path ?: p.removePrefix("file://") else p

/** Valhalla on the phone: one engine per routing-tiles file, built on first use (it maps the file) and kept until closed. */
class OfflineRouterModule : Module() {
  private val context: Context get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
  private val engines = HashMap<String, Valhalla>()

  @Synchronized
  private fun engine(path: String): Valhalla {
    engines[path]?.let { return it }
    if (!File(path).exists()) throw CodedException("ERR_NO_TILES", "No routing tiles at $path", null)
    val config = ValhallaConfigFactory.usingTileExtract(path)
    // Each file gets its own config file: two engines writing one config would point both at the same tiles.
    val name = "valhalla-${File(path).nameWithoutExtension}.json"
    val engine = Valhalla(context, config, ValhallaConfigManager(context, ValhallaFile(context, name)))
    engines[path] = engine
    return engine
  }

  override fun definition() = ModuleDefinition {
    Name("OfflineRouter")

    AsyncFunction("route") { path: String, request: String ->
      // One request at a time: a Valhalla engine is not safe to use from two threads at once.
      synchronized(this@OfflineRouterModule) { engine(plainPath(path)).routeRaw(request) }
    }

    // Routing files are published gzipped to save the rider's data; the engine maps the plain tar. Streamed: hundreds of MB unpacked.
    AsyncFunction("gunzip") { from: String, to: String ->
      val out = File(plainPath(to))
      GZIPInputStream(FileInputStream(plainPath(from)).buffered(1 shl 16), 1 shl 16).use { input ->
        FileOutputStream(out).use { output -> input.copyTo(output, 1 shl 20) }
      }
      out.length()
    }

    AsyncFunction("close") { path: String ->
      synchronized(this@OfflineRouterModule) { engines.remove(plainPath(path))?.close() }
    }
  }
}
