package expo.modules.ridealarm

import android.app.Activity
import android.app.KeyguardManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * The alarm over the lock screen: what the ring says, Snooze (while there is one) and I'm up. I'm up, here or on the notification,
 * stops the ride's rings, notes it for the app and opens the app on the pre-ride screen (after the phone is unlocked).
 */
class AlarmActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) { setShowWhenLocked(true); setTurnScreenOn(true) }
    else @Suppress("DEPRECATION") window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    handle(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handle(intent)
  }

  private fun handle(intent: Intent) {
    if (intent.action == AlarmRinger.ACTION_UP) return up(intent.getStringExtra("group") ?: return finish())
    val step = AlarmStore.step(this, intent.getStringExtra("id") ?: return finish()) ?: return finish()
    show(step)
  }

  private fun dp(v: Int) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

  private fun show(step: AlarmStep) {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(dp(32), dp(48), dp(32), dp(48))
      setBackgroundColor(Color.BLACK)
    }
    root.addView(TextView(this).apply {
      text = step.title
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 30f)
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
    })
    root.addView(TextView(this).apply {
      text = step.body
      setTextColor(Color.LTGRAY)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
      gravity = Gravity.CENTER
      setPadding(0, dp(16), 0, dp(48))
    })
    val wide = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)).apply { topMargin = dp(12) }
    if (step.snooze) root.addView(Button(this).apply {
      text = "Snooze"
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
      setOnClickListener { AlarmRinger.stop(this@AlarmActivity, step.group); finish() }
    }, wide)
    root.addView(Button(this).apply {
      text = "I'm up"
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
      setOnClickListener { up(step.group) }
    }, wide)
    setContentView(root)
  }

  private fun up(group: String) {
    AlarmStore.markWoken(this, group, System.currentTimeMillis())
    AlarmScheduler.cancelGroup(this, group)
    val launch = packageManager.getLaunchIntentForPackage(packageName)?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val km = getSystemService(KeyguardManager::class.java)
    if (km.isKeyguardLocked) {
      km.requestDismissKeyguard(this, object : KeyguardManager.KeyguardDismissCallback() {
        override fun onDismissSucceeded() { launch?.let { startActivity(it) }; finish() }
        override fun onDismissCancelled() { finish() }
        override fun onDismissError() { finish() }
      })
    } else {
      launch?.let { startActivity(it) }
      finish()
    }
  }
}
