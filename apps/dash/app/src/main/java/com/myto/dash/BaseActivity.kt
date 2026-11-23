// Copyright (C) 2026 Metehan Kaygısız
// Copyright (C) 2026 Myto
// SPDX-License-Identifier: GPL-3.0-only

package com.myto.dash

import android.content.Intent
import android.graphics.PorterDuff
import android.graphics.drawable.Drawable
import android.graphics.drawable.VectorDrawable
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity
import androidx.vectordrawable.graphics.drawable.VectorDrawableCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * Base for all activities:
 *  - runs fullscreen (system status + navigation bars hidden), since the launcher
 *    provides its own on-screen navigation
 *  - provides the shared Back / Home wiring for page headers
 */
abstract class BaseActivity : AppCompatActivity() {

    private var contentRoot: View? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enterImmersive()
    }

    override fun onResume() {
        super.onResume()
        enterImmersive()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        // Re-hide after dialogs, notifications or a swipe temporarily reveal the bars.
        if (hasFocus) enterImmersive()
    }

    /**
     * Immersive fullscreen — the launcher supplies its own navigation.
     *
     * Uses the AndroidX compat controller rather than the raw systemUiVisibility
     * flags: from targetSdk 35 Android enforces edge-to-edge and the legacy flags
     * stop behaving predictably. The compat layer maps to those same flags on old
     * devices, so KitKat still works.
     */
    private fun enterImmersive() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowCompat.getInsetsController(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    // ---- Myto colours -------------------------------------------------------

    /**
     * The colour for highlights. In Myto that is ink, not a hue: the survey-blue
     * accent is kept for the one or two things that must stand apart.
     */
    protected fun accentColor(): Int = Ui.color(this, R.color.icon_tint)

    override fun setContentView(view: View) {
        super.setContentView(view)
        contentRoot = view
        tintIcons(view)
    }

    override fun setContentView(layoutResID: Int) {
        super.setContentView(layoutResID)
        contentRoot = findViewById(android.R.id.content)
        tintIcons(contentRoot)
    }

    /**
     * Tints the launcher's own line icons with the theme's ink. Their vectors
     * already carry `@color/icon_tint`, but a colour filter survives a later
     * setImageResource, so views built in code stay consistent too.
     *
     * Album art and app icons are real pictures, not chrome, and opt out with
     * `tag="noTint"`; so does the play button, whose icon is onInk on the ink
     * circle and would vanish. The vector check guards icons from PackageManager.
     */
    protected fun tintIcons(root: View?) {
        val target = root ?: return
        val ink = accentColor()
        forEachView(target) { v ->
            if (v is ImageView && v.tag != TAG_NO_TINT && isVector(v.drawable)) {
                v.setColorFilter(ink, PorterDuff.Mode.SRC_IN)
            }
        }
    }

    /** Convenience for subclasses that rebuild views after setContentView. */
    protected fun tintIcons() = tintIcons(contentRoot)

    private fun isVector(drawable: Drawable?): Boolean = when {
        drawable == null -> false
        drawable is VectorDrawableCompat -> true
        drawable is VectorDrawable -> true
        else -> false
    }

    private fun forEachView(view: View, action: (View) -> Unit) {
        action(view)
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) forEachView(view.getChildAt(i), action)
        }
    }

    /** Wire a page header's Back / Home buttons. */
    protected fun bindPageNav(backButton: View, homeButton: View) {
        backButton.setOnClickListener { onBackPressedDispatcher.onBackPressed() }
        homeButton.setOnClickListener { goHome() }
    }

    /** Return to the launcher dashboard, clearing any pages stacked above it. */
    protected fun goHome() {
        startActivity(
            Intent(this, HomeActivity::class.java).addFlags(
                Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
        )
        finish()
    }

    protected companion object {
        /** Views tagged with this keep their own colours (art, app icons). */
        const val TAG_NO_TINT = "noTint"
    }
}
