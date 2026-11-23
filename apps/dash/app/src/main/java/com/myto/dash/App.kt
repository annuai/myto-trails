// Copyright (C) 2026 Metehan Kaygısız
// Copyright (C) 2026 Myto (restyle and changes for Myto Dash)
// SPDX-License-Identifier: GPL-3.0-only

package com.myto.dash

import android.app.Application

/** Applies the saved day/night theme as early as possible, before any activity. */
class App : Application() {

    override fun onCreate() {
        super.onCreate()
        ThemeManager.apply(Prefs(this))
    }
}
