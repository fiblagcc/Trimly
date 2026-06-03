package com.example.trimly

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.view.ViewAnimationUtils
import android.view.ViewGroup
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.math.hypot

class ProfileActivity : AppCompatActivity() {

    private var currentName = "there"
    private var currentPhone = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)

        window.statusBarColor = Color.parseColor("#F1EFE8")

        val prefs = getSharedPreferences("TrimlyPrefs", MODE_PRIVATE)
        currentName = prefs.getString("USER_NAME", "there") ?: "there"
        findViewById<TextView>(R.id.profileName).text = currentName
        findViewById<TextView>(R.id.profileRole).text =
            (prefs.getString("USER_ROLE", "client") ?: "client").replaceFirstChar { it.uppercase() }

        findViewById<CardView>(R.id.backBtn).setOnClickListener { finish() }

        // Wire the menu rows.
        findViewById<LinearLayout>(R.id.menuEditProfile).setOnClickListener { showEditProfileDialog() }
        findViewById<LinearLayout>(R.id.menuBookings).setOnClickListener {
            startActivity(Intent(this, BookingsActivity::class.java))
        }
        findViewById<LinearLayout>(R.id.menuFavorites).setOnClickListener {
            startActivity(Intent(this, FavoritesActivity::class.java))
        }
        findViewById<LinearLayout>(R.id.menuSettings).setOnClickListener { showSettingsDialog() }

        findViewById<MaterialButton>(R.id.logoutBtn).setOnClickListener { logout() }

        loadProfile()
    }

    /** Pull fresh name / phone / email from Supabase so the screen and Edit dialog are accurate. */
    private fun loadProfile() {
        lifecycleScope.launch {
            try {
                val session = SupabaseClient.client.auth.currentSessionOrNull()
                val uid = session?.user?.id ?: return@launch
                val email = session.user?.email

                val profile = SupabaseClient.client.from("profiles")
                    .select { filter { eq("id", uid) } }
                    .decodeSingleOrNull<Profile>()

                runOnUiThread {
                    currentName = profile?.full_name ?: currentName
                    currentPhone = profile?.phone ?: ""
                    findViewById<TextView>(R.id.profileName).text = currentName
                    if (!email.isNullOrEmpty()) findViewById<TextView>(R.id.profileEmail).text = email
                    profile?.role?.let {
                        findViewById<TextView>(R.id.profileRole).text = it.replaceFirstChar { c -> c.uppercase() }
                    }
                }
            } catch (_: Exception) { /* keep prefs values */ }
        }
    }

    private fun showEditProfileDialog() {
        val pad = (20 * resources.displayMetrics.density).toInt()
        val nameInput = EditText(this).apply {
            hint = "Full name"
            setText(currentName)
            setSingleLine()
            inputType = InputType.TYPE_TEXT_FLAG_CAP_WORDS
        }
        val phoneInput = EditText(this).apply {
            hint = "Phone (optional)"
            setText(currentPhone)
            inputType = InputType.TYPE_CLASS_PHONE
        }
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad / 2, pad, 0)
            addView(nameInput)
            addView(phoneInput)
        }

        AlertDialog.Builder(this)
            .setTitle("Edit profile")
            .setView(layout)
            .setPositiveButton("Save") { _, _ ->
                val newName = nameInput.text.toString().trim()
                val newPhone = phoneInput.text.toString().trim()
                if (newName.isEmpty()) {
                    Toast.makeText(this, "Name can't be empty", Toast.LENGTH_SHORT).show()
                } else {
                    saveProfile(newName, newPhone)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun saveProfile(name: String, phone: String) {
        lifecycleScope.launch {
            try {
                val uid = SupabaseClient.client.auth.currentSessionOrNull()?.user?.id
                    ?: throw IllegalStateException("Not signed in")

                SupabaseClient.client.from("profiles").update(
                    buildJsonObject {
                        put("full_name", name)
                        put("phone", phone)
                    }
                ) { filter { eq("id", uid) } }

                currentName = name
                currentPhone = phone
                getSharedPreferences("TrimlyPrefs", MODE_PRIVATE)
                    .edit().putString("USER_NAME", name).apply()

                runOnUiThread {
                    findViewById<TextView>(R.id.profileName).text = name
                    Toast.makeText(this@ProfileActivity, "Profile updated", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@ProfileActivity, "Couldn't save: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun showSettingsDialog() {
        val prefs = getSharedPreferences("TrimlyPrefs", MODE_PRIVATE)
        val notifOn = prefs.getBoolean("NOTIF_ENABLED", true)
        val options = arrayOf(
            "Push notifications: " + if (notifOn) "On" else "Off",
            "About Trimly",
            "Log out"
        )
        AlertDialog.Builder(this)
            .setTitle("Settings")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> {
                        val newVal = !notifOn
                        prefs.edit().putBoolean("NOTIF_ENABLED", newVal).apply()
                        Toast.makeText(
                            this,
                            "Push notifications " + if (newVal) "enabled" else "disabled",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                    1 -> AlertDialog.Builder(this)
                        .setTitle("About Trimly")
                        .setMessage("Trimly\nBook a barber near you, skip the wait.\n\nVersion 1.0")
                        .setPositiveButton("OK", null)
                        .show()
                    2 -> logout()
                }
            }
            .show()
    }

    private fun logout() {
        val root = window.decorView.findViewById<ViewGroup>(android.R.id.content)
        val overlay = layoutInflater.inflate(R.layout.view_logout_overlay, root, false)
        root.addView(overlay)

        // Reveal from the centre of the logout button.
        val btn = findViewById<View>(R.id.logoutBtn)
        val btnLoc = IntArray(2); btn.getLocationInWindow(btnLoc)
        val rootLoc = IntArray(2); root.getLocationInWindow(rootLoc)
        val cx = btnLoc[0] - rootLoc[0] + btn.width / 2
        val cy = btnLoc[1] - rootLoc[1] + btn.height / 2

        overlay.visibility = View.INVISIBLE
        overlay.post {
            val w = overlay.width
            val h = overlay.height
            val radius = hypot(maxOf(cx, w - cx).toDouble(), maxOf(cy, h - cy).toDouble()).toFloat()
            overlay.visibility = View.VISIBLE
            ViewAnimationUtils.createCircularReveal(overlay, cx, cy, 0f, radius).apply {
                duration = 600
                interpolator = AccelerateDecelerateInterpolator()
                start()
            }

            val razor = overlay.findViewById<View>(R.id.logoutRazor)
            val msg = overlay.findViewById<View>(R.id.logoutMsg)
            razor.alpha = 0f; razor.scaleX = 0.6f; razor.scaleY = 0.6f
            msg.alpha = 0f; msg.translationY = 20f * resources.displayMetrics.density

            razor.animate().alpha(1f).scaleX(1f).scaleY(1f)
                .setStartDelay(250).setDuration(520)
                .setInterpolator(OvershootInterpolator()).start()
            msg.animate().alpha(1f).translationY(0f)
                .setStartDelay(480).setDuration(400).start()

            overlay.postDelayed({ doSignOut() }, 1250)
        }
    }

    private fun doSignOut() {
        lifecycleScope.launch {
            // Clear the Supabase session FIRST — otherwise MainActivity sees a live
            // session and bounces straight back to Home.
            try {
                SupabaseClient.client.auth.signOut()
            } catch (_: Exception) { /* sign out locally regardless */ }

            getSharedPreferences("TrimlyPrefs", MODE_PRIVATE).edit().clear().apply()

            runOnUiThread {
                val intent = Intent(this@ProfileActivity, MainActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
                finish()
            }
        }
    }
}
