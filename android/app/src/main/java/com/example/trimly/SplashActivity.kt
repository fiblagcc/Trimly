package com.example.trimly

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.animation.AccelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val logo = findViewById<View>(R.id.splash_logo)
        val title = findViewById<View>(R.id.splash_title)
        val tagline = findViewById<View>(R.id.splash_tagline)
        val group = listOf(logo, title, tagline)
        val density = resources.displayMetrics.density

        // Initial hidden state.
        group.forEach { it.alpha = 0f; it.translationY = 22f * density }
        logo.scaleX = 0.85f
        logo.scaleY = 0.85f

        lifecycleScope.launch {
            // Resolve where to go OFF the main thread, in parallel with the animation,
            // so the session check + role query never stutter the rise.
            val destination = async(Dispatchers.IO) { resolveDestination() }

            // Entrance: logo pops in (overshoot), then wordmark + tagline fade up.
            logo.animate()
                .alpha(1f).translationY(0f).scaleX(1f).scaleY(1f)
                .setDuration(560L).setInterpolator(OvershootInterpolator(1.6f)).start()
            title.animate()
                .alpha(1f).translationY(0f)
                .setStartDelay(170L).setDuration(430L)
                .setInterpolator(DecelerateInterpolator()).start()
            tagline.animate()
                .alpha(1f).translationY(0f)
                .setStartDelay(310L).setDuration(430L)
                .setInterpolator(DecelerateInterpolator()).start()

            // Hold so it's readable (the destination keeps resolving in the background).
            delay(1300)

            // Exit: the whole block glides up and fades. Main thread is free now → smooth.
            val up = -(resources.displayMetrics.heightPixels * 0.30f)
            group.forEachIndexed { i, v ->
                v.animate()
                    .translationY(up).alpha(0f)
                    .setStartDelay(i * 45L).setDuration(480L)
                    .setInterpolator(AccelerateInterpolator(1.4f)).start()
            }
            delay(540) // let the exit finish fully before swapping screens

            // Destination is almost certainly ready by now; cap the wait just in case.
            val dest = withTimeoutOrNull(2500) { destination.await() } ?: MainActivity::class.java
            startActivity(Intent(this@SplashActivity, dest))
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            finish()
        }
    }

    /** Decide the first screen. Runs on a background dispatcher (network + storage). */
    private suspend fun resolveDestination(): Class<*> = withContext(Dispatchers.IO) {
        val session = try {
            SupabaseClient.client.auth.currentSessionOrNull()
        } catch (e: Exception) { null }

        if (session == null) {
            val seen = getSharedPreferences("TrimlyPrefs", MODE_PRIVATE)
                .getBoolean("ONBOARDING_SEEN", false)
            return@withContext if (!seen) OnboardingActivity::class.java else MainActivity::class.java
        }

        val uid = session.user?.id
        val role = try {
            SupabaseClient.client.from("profiles")
                .select { filter { eq("id", uid ?: "") } }
                .decodeSingleOrNull<Profile>()
                ?.role
        } catch (e: Exception) { null }

        if (role == "barber") BarberDashboardActivity::class.java else HomeActivity::class.java
    }
}
