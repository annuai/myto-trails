// Copyright (C) 2026 Metehan Kaygısız
// Copyright (C) 2026 Myto (restyle and changes for Myto Dash)
// SPDX-License-Identifier: GPL-3.0-only

package com.myto.dash

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.myto.dash.databinding.ActivitySettingsBinding

/** Launcher settings: change which app each role uses. */
class SettingsActivity : BaseActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private lateinit var prefs: Prefs

    private companion object {
        const val REQ_DEFAULT_LAUNCHER = 10
        const val REQ_LOCATION = 11
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        prefs = Prefs(this)

        binding.header.pageTitle.setText(R.string.settings_title)
        bindPageNav(binding.header.navBack, binding.header.navHome)

        binding.rowPhone.setOnClickListener {
            AppPickerActivity.start(this, Prefs.ROLE_PHONE, 1)
        }
        binding.rowNav.setOnClickListener {
            AppPickerActivity.start(this, Prefs.ROLE_NAV, 2)
        }
        binding.rowRadio.setOnClickListener {
            AppPickerActivity.start(this, Prefs.ROLE_RADIO, 3)
        }
        binding.rowMedia.setOnClickListener {
            AppPickerActivity.start(this, Prefs.ROLE_MEDIA, 5)
        }
        binding.rowAndroidAuto.setOnClickListener {
            AppPickerActivity.start(this, Prefs.ROLE_ANDROID_AUTO, 6)
        }
        binding.rowCarPlay.setOnClickListener {
            AppPickerActivity.start(this, Prefs.ROLE_CARPLAY, 7)
        }
        binding.rowLocationAccess.setOnClickListener {
            when {
                Permissions.hasLocation(this) -> Unit
                Permissions.locationPermanentlyDenied(this) -> Permissions.openAppSettings(this)
                else -> Permissions.requestLocation(this, REQ_LOCATION)
            }
        }
        binding.rowNotificationAccess.setOnClickListener {
            NotificationAccess.openSettings(this)
        }
        binding.rowTempUnit.setOnClickListener {
            prefs.useFahrenheit = !prefs.useFahrenheit
            refresh()
        }
        binding.rowTheme.setOnClickListener { showThemeDialog() }
        binding.rowCustomize.setOnClickListener {
            startActivity(Intent(this, CustomizeActivity::class.java))
        }
        binding.rowClockStyle.setOnClickListener { showClockStyleDialog() }
        binding.rowChrono.setOnClickListener {
            prefs.chronoEnabled = !prefs.chronoEnabled
            refresh()
        }
        binding.rowTabs.setOnClickListener {
            startActivity(Intent(this, TabOrderActivity::class.java))
        }
        binding.rowKeepOn.setOnClickListener {
            prefs.keepScreenOn = !prefs.keepScreenOn
            refresh()
        }
        binding.rowDefaultLauncher.setOnClickListener {
            DefaultLauncher.request(this, REQ_DEFAULT_LAUNCHER)
        }
        binding.rowResetHidden.setOnClickListener {
            prefs.clearHiddenApps()
            refresh()
        }

        refresh()
    }

    override fun onResume() {
        super.onResume()
        refresh()  // reflect notification-access / default-launcher changes on return
    }

    /** Small helper for the single-choice dialogs this screen is full of. */
    private fun pick(titleRes: Int, options: List<Pair<String, Int>>, onPick: (String) -> Unit) {
        val labels = options.map { getString(it.second) }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle(titleRes)
            .setItems(labels) { _, which ->
                onPick(options[which].first)
                refresh()
            }
            .show()
    }

    private fun showClockStyleDialog() {
        val styles = listOf(
            Prefs.CLOCK_DIGITAL to R.string.clock_digital,
            Prefs.CLOCK_ANALOG to R.string.clock_analog,
            Prefs.CLOCK_MINIMAL to R.string.clock_minimal
        )
        val labels = styles.map { getString(it.second) }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle(R.string.settings_clock_style)
            .setItems(labels) { _, which ->
                prefs.clockStyle = styles[which].first
                refresh()
            }
            .show()
    }

    private fun showThemeDialog() {
        val modes = listOf(
            Prefs.THEME_AUTO to R.string.theme_auto,
            Prefs.THEME_LIGHT to R.string.theme_light,
            Prefs.THEME_DARK to R.string.theme_dark,
            Prefs.THEME_SYSTEM to R.string.theme_system
        )
        val labels = modes.map { getString(it.second) }.toTypedArray()
        AlertDialog.Builder(this)
            .setTitle(R.string.settings_theme)
            .setItems(labels) { _, which ->
                prefs.themeMode = modes[which].first
                ThemeManager.apply(prefs)  // recreates activities as needed
                refresh()
            }
            .show()
    }

    /**
     * A manual check, so a user can confirm they're current rather than having to
     * infer it from the absence of a prompt. Unlike the automatic one this
     * ignores the once-a-day limit and says something either way.
     */
    private fun refresh() {
        binding.phoneValue.text = label(prefs.phoneApp)
        binding.navValue.text = label(prefs.navApp)
        binding.radioValue.text = label(prefs.radioApp)
        binding.mediaValue.text = label(prefs.mediaApp)
        binding.androidAutoValue.text = label(prefs.androidAutoApp)
        binding.carPlayValue.text = label(prefs.carPlayApp)
        binding.locationAccessValue.text = getString(
            if (Permissions.hasLocation(this)) R.string.access_granted
            else R.string.access_needed
        )
        binding.notificationAccessValue.text = getString(
            if (NotificationAccess.isGranted(this)) R.string.access_enabled
            else R.string.access_disabled
        )
        binding.tempUnitValue.text = getString(
            if (prefs.useFahrenheit) R.string.unit_fahrenheit else R.string.unit_celsius
        )
        binding.themeValue.text = getString(themeLabel(prefs.themeMode))
        val tabs = prefs.visibleTabs().size
        binding.tabsValue.text = resources.getQuantityString(R.plurals.tabs_count, tabs, tabs)
        binding.clockStyleValue.text = getString(when (prefs.clockStyle) {
            Prefs.CLOCK_ANALOG -> R.string.clock_analog
            Prefs.CLOCK_MINIMAL -> R.string.clock_minimal
            else -> R.string.clock_digital
        })
        binding.chronoValue.text = getString(if (prefs.chronoEnabled) R.string.on else R.string.off)

        binding.keepOnValue.text = getString(if (prefs.keepScreenOn) R.string.on else R.string.off)
        binding.defaultLauncherValue.text = getString(
            if (DefaultLauncher.isDefault(this)) R.string.yes else R.string.set_now
        )
        val hidden = prefs.hiddenApps.size
        binding.resetHiddenValue.text =
            resources.getQuantityString(R.plurals.hidden_count, hidden, hidden)

        binding.versionValue.text = getString(
            R.string.settings_version_value,
            BuildConfig.VERSION_NAME,
            BuildConfig.VERSION_CODE
        )
    }

    private fun themeLabel(mode: String): Int = when (mode) {
        Prefs.THEME_LIGHT -> R.string.theme_light
        Prefs.THEME_DARK -> R.string.theme_dark
        Prefs.THEME_SYSTEM -> R.string.theme_system
        else -> R.string.theme_auto
    }

    private fun label(pkg: String?): String =
        AppRepository.labelFor(this, pkg) ?: getString(R.string.not_set)

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        refresh()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        refresh()
    }
}
