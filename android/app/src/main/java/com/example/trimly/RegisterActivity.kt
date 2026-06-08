package com.example.trimly

import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class RegisterActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        window.statusBarColor = Color.parseColor("#F1EFE8")

        val backToLogin = findViewById<TextView>(R.id.backToLogin)
        val loginText = findViewById<TextView>(R.id.loginText)
        val btnClient = findViewById<Button>(R.id.btnClient)
        val btnBarber = findViewById<Button>(R.id.btnBarber)
        val registerBtn = findViewById<MaterialButton>(R.id.registerBtn)

        var selectedRole = "Client"

        backToLogin.setOnClickListener { finish() }
        loginText.setOnClickListener { finish() }

        btnClient.setOnClickListener {
            selectedRole = "Client"
            btnClient.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#1D9E75"))
            btnClient.setTextColor(Color.WHITE)
            btnBarber.backgroundTintList = ColorStateList.valueOf(Color.TRANSPARENT)
            btnBarber.setTextColor(Color.parseColor("#5B5A55"))
        }

        btnBarber.setOnClickListener {
            selectedRole = "Barber"
            btnBarber.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#1D9E75"))
            btnBarber.setTextColor(Color.WHITE)
            btnClient.backgroundTintList = ColorStateList.valueOf(Color.TRANSPARENT)
            btnClient.setTextColor(Color.parseColor("#5B5A55"))
        }

        registerBtn.setOnClickListener {
            val name = findViewById<TextInputEditText>(R.id.fullNameInput).text.toString().trim()
            val email = findViewById<TextInputEditText>(R.id.emailInput).text.toString().trim()
            val phone = findViewById<TextInputEditText>(R.id.phoneInput).text.toString().trim()
            val password = findViewById<TextInputEditText>(R.id.passwordInput).text.toString().trim()

            if (name.isEmpty() || email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (password.length < 6) {
                Toast.makeText(this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            registerBtn.isEnabled = false
            registerBtn.text = "Creating account..."

            lifecycleScope.launch {
                try {
                    // The DB trigger `on_auth_user_created` creates the profile row from
                    // these metadata fields. We must NOT insert into `profiles` manually
                    // (it's blocked by RLS by design). Just pass the data at signup.
                    SupabaseClient.client.auth.signUpWith(Email) {
                        this.email = email
                        this.password = password
                        data = buildJsonObject {
                            put("full_name", name)
                            put("role", selectedRole.lowercase())
                            if (phone.isNotEmpty()) put("phone", phone)
                        }
                    }

                    val prefs = getSharedPreferences("TrimlyPrefs", MODE_PRIVATE)
                    prefs.edit().putString("USER_NAME", name).apply()
                    prefs.edit().putString("USER_ROLE", selectedRole).apply()

                    val dest = if (selectedRole == "Barber")
                        BarberDashboardActivity::class.java else HomeActivity::class.java
                    runOnUiThread {
                        Toast.makeText(this@RegisterActivity, "Account created!", Toast.LENGTH_SHORT).show()
                        startActivity(Intent(this@RegisterActivity, dest))
                        finish()
                    }

                } catch (e: Exception) {
                    runOnUiThread {
                        registerBtn.isEnabled = true
                        registerBtn.text = "Create Account"
                        Toast.makeText(this@RegisterActivity, friendlyError(e, "Registration failed"), Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }
}