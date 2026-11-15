package expo.modules.ridealarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri

/**
 * Rings: a notification on an alarm channel (the alarm sound at alarm volume, so it plays with the ringer off, and allowed through Do
 * Not Disturb where the rider lets it), repeating until it is answered, over the lock screen as a full-screen alarm where Android allows
 * it. It stops by itself after two minutes; the next ring of the ride is already set.
 */
object AlarmRinger {
  // A channel's sound cannot change once made, so the version is in the name.
  private const val CHANNEL = "ride-alarm-native-v1"
  private const val RING_MS = 2 * 60_000L
  const val ACTION_SNOOZE = "expo.modules.ridealarm.SNOOZE"
  const val ACTION_UP = "expo.modules.ridealarm.UP"

  fun notificationId(group: String) = 0x5A1A0000 or (group.hashCode() and 0xFFFF)

  private fun ensureChannel(c: Context) {
    val nm = c.getSystemService(NotificationManager::class.java)
    if (nm.getNotificationChannel(CHANNEL) != null) return
    val ch = NotificationChannel(CHANNEL, "Ride alarms", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "The wake-up alarm before a ride"
      setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 600, 400, 600)
      setBypassDnd(true)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    nm.createNotificationChannel(ch)
  }

  private fun flags() = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
  private fun uri(kind: String, id: String) = Uri.parse("myto-alarm://$kind/${Uri.encode(id)}")

  fun screenIntent(c: Context, step: AlarmStep): PendingIntent =
    PendingIntent.getActivity(c, 0, Intent(c, AlarmActivity::class.java).setData(uri("screen", step.id)).putExtra("id", step.id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION), flags())

  fun upIntent(c: Context, group: String): PendingIntent =
    PendingIntent.getActivity(c, 0, Intent(c, AlarmActivity::class.java).setAction(ACTION_UP).setData(uri("up", group)).putExtra("group", group).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), flags())

  private fun snoozeIntent(c: Context, group: String): PendingIntent =
    PendingIntent.getBroadcast(c, 0, Intent(c, AlarmReceiver::class.java).setAction(ACTION_SNOOZE).setData(uri("snooze", group)).putExtra("group", group), flags())

  fun ring(c: Context, step: AlarmStep) {
    ensureChannel(c)
    val nm = c.getSystemService(NotificationManager::class.java)
    val b = Notification.Builder(c, CHANNEL)
      .setSmallIcon(R.drawable.ride_alarm_icon)
      .setContentTitle(step.title)
      .setContentText(step.body)
      .setStyle(Notification.BigTextStyle().bigText(step.body))
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setFullScreenIntent(screenIntent(c, step), true)
      .setContentIntent(screenIntent(c, step))
      .setOngoing(true)
      .setAutoCancel(false)
      .setTimeoutAfter(RING_MS)
    if (step.snooze) b.addAction(Notification.Action.Builder(null, "Snooze", snoozeIntent(c, step.group)).build())
    b.addAction(Notification.Action.Builder(null, "I'm up", upIntent(c, step.group)).build())
    val n = b.build()
    n.flags = n.flags or Notification.FLAG_INSISTENT
    nm.notify(notificationId(step.group), n)
  }

  fun stop(c: Context, group: String) = c.getSystemService(NotificationManager::class.java).cancel(notificationId(group))
}
