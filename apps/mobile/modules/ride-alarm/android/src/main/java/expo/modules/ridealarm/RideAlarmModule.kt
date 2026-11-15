package expo.modules.ridealarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Ride alarms on Android: the app hands over the planned rings; the receiver, the alarm screen and a restart work from what is stored. */
class RideAlarmModule : Module() {
  private val context: Context get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
  private val nm get() = context.getSystemService(NotificationManager::class.java)

  private fun open(action: String) {
    context.startActivity(Intent(action, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }

  override fun definition() = ModuleDefinition {
    Name("RideAlarm")

    Function("isSupported") { true }

    AsyncFunction("authorization") { if (nm.areNotificationsEnabled()) "granted" else "denied" }

    // Notification permission is asked for by the app (expo-notifications); this only reports it.
    AsyncFunction("requestAuthorization") { nm.areNotificationsEnabled() }

    AsyncFunction("replaceAll") { json: String ->
      AlarmStore.saveSteps(context, json)
      AlarmScheduler.scheduleAll(context)
    }

    AsyncFunction("takeWoken") { AlarmStore.takeWoken(context) }

    Function("canScheduleExact") { AlarmScheduler.canExact(context) }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) open(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
    }

    Function("canUseFullScreen") { Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent() }

    Function("openFullScreenSettings") {
      if (Build.VERSION.SDK_INT >= 34) open(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
    }
  }
}
