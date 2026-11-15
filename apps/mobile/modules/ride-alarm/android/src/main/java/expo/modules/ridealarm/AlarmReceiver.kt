package expo.modules.ridealarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** A ring coming due, or Snooze (which only stops this ring: the next one is already set). Runs without the app's JavaScript. */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(c: Context, intent: Intent) {
    when (intent.action) {
      AlarmScheduler.ACTION_FIRE -> {
        val step = AlarmStore.step(c, intent.getStringExtra("id") ?: return) ?: return
        if (AlarmStore.isDone(c, step.group)) return
        AlarmRinger.ring(c, step)
      }
      AlarmRinger.ACTION_SNOOZE -> AlarmRinger.stop(c, intent.getStringExtra("group") ?: return)
    }
  }
}
