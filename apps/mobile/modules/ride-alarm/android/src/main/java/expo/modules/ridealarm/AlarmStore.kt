package expo.modules.ridealarm

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** One ring, as planned by the app (src/lib/alarm/ladder.ts). */
data class AlarmStep(
  val id: String,
  val group: String,
  val index: Int,
  val fireAt: Long,
  val title: String,
  val body: String,
  val snooze: Boolean,
  val route: String,
)

/**
 * The rings and what the rider did, kept in the app's private preferences so the receiver, the alarm screen and a restart can read
 * them without the app's JavaScript running.
 */
object AlarmStore {
  private const val PREFS = "myto.ride-alarm"
  private const val STEPS = "steps"
  private const val SCHEDULED = "scheduled"
  private const val WOKEN = "woken"
  private const val DONE = "done"
  /** A group the rider got up for is never rung again, even if the app sends it back before it has heard. Forgotten after two days. */
  private const val DONE_KEEP_MS = 2 * 86_400_000L

  private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun parse(json: String): List<AlarmStep> {
    val arr = runCatching { JSONArray(json) }.getOrNull() ?: return emptyList()
    return (0 until arr.length()).mapNotNull { i ->
      val o = arr.optJSONObject(i) ?: return@mapNotNull null
      runCatching {
        AlarmStep(o.getString("id"), o.getString("group"), o.optInt("index"), o.getLong("fireAt"), o.getString("title"), o.optString("body"), o.optBoolean("snooze", true), o.optString("route"))
      }.getOrNull()
    }
  }

  fun steps(c: Context): List<AlarmStep> = parse(prefs(c).getString(STEPS, "[]") ?: "[]")
  fun step(c: Context, id: String): AlarmStep? = steps(c).firstOrNull { it.id == id }
  fun saveSteps(c: Context, json: String) = prefs(c).edit().putString(STEPS, json).apply()

  fun scheduled(c: Context): Set<String> = prefs(c).getStringSet(SCHEDULED, emptySet()) ?: emptySet()
  fun saveScheduled(c: Context, ids: Set<String>) = prefs(c).edit().putStringSet(SCHEDULED, ids).apply()

  private fun doneMap(c: Context): JSONObject = runCatching { JSONObject(prefs(c).getString(DONE, "{}") ?: "{}") }.getOrDefault(JSONObject())

  fun isDone(c: Context, group: String): Boolean = doneMap(c).has(group)

  /** The rider pressed "I'm up": the group rings no more, and the app hears of it next time it opens. */
  fun markWoken(c: Context, group: String, at: Long) {
    val done = doneMap(c)
    val now = System.currentTimeMillis()
    done.keys().asSequence().toList().forEach { if (now - done.optLong(it) > DONE_KEEP_MS) done.remove(it) }
    done.put(group, at)
    val woken = runCatching { JSONArray(prefs(c).getString(WOKEN, "[]")) }.getOrDefault(JSONArray())
    woken.put(JSONObject().put("group", group).put("at", at))
    prefs(c).edit().putString(DONE, done.toString()).putString(WOKEN, woken.toString()).apply()
  }

  fun takeWoken(c: Context): String {
    val p = prefs(c)
    val out = p.getString(WOKEN, "[]") ?: "[]"
    p.edit().putString(WOKEN, "[]").apply()
    return out
  }
}
