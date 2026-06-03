package com.example.trimly

import android.content.Intent
import android.os.Bundle
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable

@Serializable
data class Profile(
    val id: String,
    val role: String? = null,
    val full_name: String? = null,
    val phone: String? = null
)

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        window.statusBarColor = android.graphics.Color.parseColor("#F1EFE8")

        lifecycleScope.launch {
            val session = SupabaseClient.client.auth.currentSessionOrNull()
            if (session != null) {
                startActivity(Intent(this@MainActivity, HomeActivity::class.java))
                finish()
            }
        }

        val loginBtn = findViewById<MaterialButton>(R.id.loginBtn)
        val registerText = findViewById<TextView>(R.id.registerText)

        loginBtn.setOnClickListener {
            val email = findViewById<TextInputEditText>(R.id.usernameInput).text.toString().trim()
            val password = findViewById<TextInputEditText>(R.id.passwordInput).text.toString().trim()

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            loginBtn.isEnabled = false
            loginBtn.text = "Logging in..."

            lifecycleScope.launch {
                try {
                    SupabaseClient.client.auth.signInWith(Email) {
                        this.email = email
                        this.password = password
                    }

                    val userId = SupabaseClient.client.auth.currentSessionOrNull()?.user?.id
                    val profile = try {
                        SupabaseClient.client.from("profiles")
                            .select { filter { eq("id", userId ?: "") } }
                            .decodeSingleOrNull<Profile>()
                    } catch (e: Exception) { null }

                    val prefs = getSharedPreferences("TrimlyPrefs", MODE_PRIVATE)
                    prefs.edit()
                        .putString("USER_NAME", profile?.full_name ?: "there")
                        .putString("USER_ROLE", profile?.role ?: "client")
                        .apply()

                    runOnUiThread {
                        startActivity(Intent(this@MainActivity, HomeActivity::class.java))
                        finish()
                    }

                } catch (e: Exception) {
                    runOnUiThread {
                        loginBtn.isEnabled = true
                        loginBtn.text = "Login"
                        Toast.makeText(this@MainActivity, e.message ?: "Login failed", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        registerText.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }

        findViewById<TextView>(R.id.forgotPassword).setOnClickListener {
            val email = findViewById<TextInputEditText>(R.id.usernameInput).text.toString().trim()
            if (email.isEmpty()) {
                Toast.makeText(this, "Enter your email above first, then tap Forgot password.", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            lifecycleScope.launch {
                try {
                    SupabaseClient.client.auth.resetPasswordForEmail(email)
                    runOnUiThread {
                        Toast.makeText(
                            this@MainActivity,
                            "Password reset link sent to $email. Check your inbox.",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, e.message ?: "Couldn't send reset email", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }
}

