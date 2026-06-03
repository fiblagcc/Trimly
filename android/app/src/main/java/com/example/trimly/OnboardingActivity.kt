package com.example.trimly

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton

class OnboardingActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_onboarding)

        window.statusBarColor = Color.parseColor("#0F6E56")

        findViewById<MaterialButton>(R.id.getStartedBtn).setOnClickListener { goToLogin() }
        findViewById<TextView>(R.id.onboardSignIn).setOnClickListener { goToLogin() }
    }

    private fun goToLogin() {
        getSharedPreferences("TrimlyPrefs", MODE_PRIVATE)
            .edit().putBoolean("ONBOARDING_SEEN", true).apply()
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
