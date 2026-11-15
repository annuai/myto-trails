package expo.modules.ridealarm

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

/**
 * Sets each ring with the system alarm clock (`setAlarmClock`): exact, allowed through Doze, and shown as the next alarm in the status
 * bar. Every ring of a ride is set up front, so Snooze only has to take the current one away. Without the exact-alarm permission the
 * ring is set inexactly and may come a few minutes late.
 */
object AlarmScheduler {
  const val ACTION_FIRE = "expo.modules.ridealarm.FIRE"

  private fun fireIntent(c: Context, id: String): PendingIntent {
    val i = Intent(c, AlarmReceiver::class.java).setAction(ACTION_FIRE).setData(Uri.parse("myto-alarm://ring/${Uri.encode(id)}")).putExtra("id", id)
    return PendingIntent.getBroadcast(c, 0, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  /** What a tap on the status bar's alarm icon opens: the app. */
  private fun showIntent(c: Context): PendingIntent? {
    val launch = c.packageManager.getLaunchIntentForPackage(c.packageName) ?: return null
    return PendingIntent.getActivity(c, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  fun canExact(c: Context): Boolean = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || c.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()

  /** Cancels what was set and sets the stored rings that are still ahead and not for a ride the rider is already up for. */
  fun scheduleAll(c: Context) {
    val am = c.getSystemService(AlarmManager::class.java)
    AlarmStore.scheduled(c).forEach { am.cancel(fireIntent(c, it)) }
    val now = System.currentTimeMillis()
    val set = mutableSetOf<String>()
    for (s in AlarmStore.steps(c)) {
      if (s.fireAt <= now || AlarmStore.isDone(c, s.group)) continue
      val pi = fireIntent(c, s.id)
      try {
        if (canExact(c)) am.setAlarmClock(AlarmManager.AlarmClockInfo(s.fireAt, showIntent(c)), pi)
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, s.fireAt, pi)
        set.add(s.id)
      } catch (_: SecurityException) {
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, s.fireAt, pi)
        set.add(s.id)
      }
    }
    AlarmStore.saveScheduled(c, set)
  }

  /** The rider is up: no more rings for this ride, and the one ringing stops. */
  fun cancelGroup(c: Context, group: String) {
    val am = c.getSystemService(AlarmManager::class.java)
    val ids = AlarmStore.steps(c).filter { it.group == group }.map { it.id }
    ids.forEach { am.cancel(fireIntent(c, it)) }
    AlarmStore.saveScheduled(c, AlarmStore.scheduled(c) - ids.toSet())
    c.getSystemService(NotificationManager::class.java).cancel(AlarmRinger.notificationId(group))
  }
}
