package expo.modules.ridealarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Alarms do not survive a restart, an app update or a change of the exact-alarm permission: set them again from what is stored. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(c: Context, intent: Intent) {
    AlarmScheduler.scheduleAll(c)
  }
}
