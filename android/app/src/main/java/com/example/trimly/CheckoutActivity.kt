package com.example.trimly

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class CheckoutActivity : AppCompatActivity() {

    private var slotId = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_checkout)

        window.statusBarColor = Color.parseColor("#F1EFE8")

        slotId = intent.getStringExtra("SLOT_ID") ?: ""
        val shopName = intent.getStringExtra("SHOP_NAME") ?: "Barbershop"
        val slotLabel = intent.getStringExtra("SLOT_LABEL") ?: ""
        val names = intent.getStringArrayListExtra("SERVICE_NAMES") ?: arrayListOf("Haircut")
        val prices = intent.getIntegerArrayListExtra("SERVICE_PRICES") ?: arrayListOf(0)

        findViewById<CardView>(R.id.backBtn).setOnClickListener { finish() }
        findViewById<TextView>(R.id.coShop).text = shopName
        findViewById<TextView>(R.id.coDateTime).text =
            if (slotLabel.isNotEmpty()) slotLabel else "Selected time"

        val container = findViewById<LinearLayout>(R.id.servicesContainer)
        var subtotal = 0
        val padH = (8 * resources.displayMetrics.density).toInt()
        val padV = (10 * resources.displayMetrics.density).toInt()

        names.forEachIndexed { i, name ->
            val price = prices.getOrElse(i) { 0 }
            subtotal += price
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(padH, padV, padH, padV)
                gravity = android.view.Gravity.CENTER_VERTICAL
            }
            row.addView(TextView(this).apply {
                text = name
                setTextColor(Color.parseColor("#1A1A1A"))
                textSize = 14f
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            })
            row.addView(TextView(this).apply {
                text = "$$price"
                setTextColor(Color.parseColor("#1A1A1A"))
                textSize = 14f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            container.addView(row)
        }

        findViewById<TextView>(R.id.coSubtotal).text = "$$subtotal"

        val payBtn = findViewById<MaterialButton>(R.id.payBtn)
        payBtn.text = "Confirm Appointment"
        payBtn.setOnClickListener { book(names.joinToString(" + "), payBtn) }
    }

    private fun book(serviceNames: String, payBtn: MaterialButton) {
        if (slotId.isEmpty()) {
            Toast.makeText(this, "No time selected", Toast.LENGTH_SHORT).show()
            return
        }
        payBtn.isEnabled = false
        payBtn.text = "Confirming..."

        lifecycleScope.launch {
            try {
                // book_slot is SECURITY DEFINER: validates auth/slot/past/active,
                // sets client_id = auth.uid(), and flips the slot to booked atomically.
                SupabaseClient.client.postgrest.rpc(
                    "book_slot",
                    buildJsonObject {
                        put("p_slot_id", slotId)
                        put("p_service", serviceNames)
                    }
                )
                runOnUiThread {
                    val toast = Toast.makeText(
                        this@CheckoutActivity,
                        "✂️ Appointment confirmed!",
                        Toast.LENGTH_LONG
                    )
                    toast.setGravity(android.view.Gravity.TOP or android.view.Gravity.CENTER_HORIZONTAL, 0, 100)
                    toast.show()
                    Handler(Looper.getMainLooper()).postDelayed({
                        val intent = Intent(this@CheckoutActivity, BookingsActivity::class.java)
                        intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
                        startActivity(intent)
                        finish()
                    }, 1500)
                }
            } catch (e: Exception) {
                runOnUiThread {
                    payBtn.isEnabled = true
                    payBtn.text = "Confirm Appointment"
                    val msg = e.message ?: ""
                    val friendly = when {
                        msg.contains("booked", ignoreCase = true) -> "That slot was just taken. Pick another time."
                        msg.contains("past", ignoreCase = true) -> "That time has already passed."
                        msg.contains("active", ignoreCase = true) -> "This shop isn't accepting bookings right now."
                        msg.contains("auth", ignoreCase = true) || msg.contains("JWT", ignoreCase = true) -> "Please sign in to book."
                        else -> "Couldn't book: $msg"
                    }
                    Toast.makeText(this@CheckoutActivity, friendly, Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}
