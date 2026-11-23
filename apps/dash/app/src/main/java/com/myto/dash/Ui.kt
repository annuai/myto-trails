// Copyright (C) 2026 Metehan Kaygısız
// Copyright (C) 2026 Myto
// SPDX-License-Identifier: GPL-3.0-only

package com.myto.dash

import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import androidx.core.content.ContextCompat
import java.text.Collator
import java.text.Normalizer
import java.util.Locale

/**
 * Small helpers that replace Dashline's GradientThemes and LocaleManager.
 * Myto Dash has one look (the Myto palette in the colors.xml resources) and
 * follows the system language, so neither needed to stay.
 */
object Ui {

    fun color(context: Context, res: Int): Int = ContextCompat.getColor(context, res)

    fun isNight(context: Context): Boolean =
        (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
            Configuration.UI_MODE_NIGHT_YES

    /** A solid rounded rectangle, for the few surfaces painted in code. */
    fun roundedRect(color: Int, radiusPx: Float): GradientDrawable =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = radiusPx
        }

    /** [color] at [alpha] (0..255). */
    fun withAlpha(color: Int, alpha: Int): Int =
        Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color))

    fun dp(context: Context, res: Int): Float = context.resources.getDimension(res)

    /** Sorts app names the way the user's language does ("Ä" next to "A"). */
    fun collator(): Collator =
        Collator.getInstance(Locale.getDefault()).apply { strength = Collator.PRIMARY }

    /**
     * Folds text for search (kept from Dashline): lowercase, accents stripped,
     * Greek final sigma and Turkish dotless ı made ordinary, because people type
     * without accents on a car screen ("telephone" must find "Téléphone").
     */
    fun searchKey(text: String): String =
        Normalizer.normalize(text.lowercase(), Normalizer.Form.NFD)
            .replace(DIACRITICS, "")
            .replace('ς', 'σ')
            .replace('ı', 'i')

    private val DIACRITICS = Regex("\\p{Mn}+")
}
