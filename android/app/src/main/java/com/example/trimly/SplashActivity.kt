package com.example.trimly

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.animation.AccelerateInterpolator
import android.view.animation.DecelerateInterpolator
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val logo = findViewById<View>(R.id.splash_logo)
        val title = findViewById<View>(R.id.splash_title)
        val tagline = findViewById<View>(R.id.splash_tagline)
        val group = listOf(logo, title, tagline)

        val density = resources.displayMetrics.density

        // Entrance: fade + small rise, staggered 120ms apart.
        val startRise = 18f * density
        group.forEach { it.alpha = 0f; it.translationY = startRise }
        group.forEachIndexed { i, v ->
            v.animate()
                .alpha(1f)
                .translationY(0f)
                .setStartDelay(i * 120L)
                .setDuration(380L)
                .setInterpolator(DecelerateInterpolator())
                .start()
        }

        lifecycleScope.launch {
            // Hold so the reveal is readable, then send the logo upward and leave.
            delay(1300)

            val up = -(resources.displayMetrics.heightPixels * 0.28f)
            group.forEach { v ->
                v.animate()
                    .translationY(up)
                    .alpha(0f)
                    .setStartDelay(0L)
                    .setDuration(520L)
                    .setInterpolator(AccelerateInterpolator())
                    .start()
            }

            // Change the view right as the logo finishes rising up.
            delay(480)
            val session = SupabaseClient.client.auth.currentSessionOrNull()
            val seenOnboarding = getSharedPreferences("TrimlyPrefs", MODE_PRIVATE)
                .getBoolean("ONBOARDING_SEEN", false)
            val next = when {
                session != null -> destinationForCurrentUser()
                !seenOnboarding -> OnboardingActivity::class.java
                else -> MainActivity::class.java
            }
            startActivity(Intent(this@SplashActivity, next))
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            finish()
        }
    }
}
