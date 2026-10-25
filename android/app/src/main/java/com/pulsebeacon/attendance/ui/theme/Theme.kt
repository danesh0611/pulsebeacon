package com.pulsebeacon.attendance.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val IndigoPrimary = Color(0xFF4F46E5)
val IndigoSecondary = Color(0xFF6366F1)
val TealAccent = Color(0xFF0D9488)
val EmeraldSuccess = Color(0xFF10B981)
val SlateDark = Color(0xFF0F172A)
val SlateSurface = Color(0xFF1E293B)
val SlateText = Color(0xFFF8FAFC)

private val DarkColorScheme = darkColorScheme(
    primary = IndigoSecondary,
    secondary = TealAccent,
    background = SlateDark,
    surface = SlateSurface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = SlateText,
    onSurface = SlateText,
)

private val LightColorScheme = lightColorScheme(
    primary = IndigoPrimary,
    secondary = TealAccent,
    background = Color(0xFFF8FAFC),
    surface = Color.White,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF0F172A),
)

@Composable
fun PulseBeaconTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
