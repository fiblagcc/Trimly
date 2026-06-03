package com.example.trimly

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.lifecycle.lifecycleScope
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

@Serializable
data class ShopRef(
    val shop_name: String? = null,
    val address: String? = null
)

@Serializable
data class SlotRef(
    val starts_at: String? = null
)

@Serializable
data class Appointment(
    val id: String,
    val service: String,
    val status: String,
    val created_at: String,
    val barbershop_id: String? = null,
    val client_id: String? = null,
    // Embedded via PostgREST foreign-key joins.
    val barbershops: ShopRef? = null,
    val availability_slots: SlotRef? = null
)

class BookingsActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_bookings)

        window.statusBarColor = Color.parseColor("#F1EFE8")

        findViewById<CardView>(R.id.backBtn).setOnClickListener { finish() }

        loadBookings()
    }

    private fun loadBookings() {
        val container = findViewById<LinearLayout>(R.id.bookingsContainer)
        val emptyView = findViewById<LinearLayout>(R.id.emptyView)

        lifecycleScope.launch {
            try {
                val userId = SupabaseClient.client.auth.currentSessionOrNull()?.user?.id
                if (userId == null) {
                    runOnUiThread { emptyView.visibility = View.VISIBLE }
                    return@launch
                }

                // Embed the shop name/address and the slot time in a single round trip.
                val appointments = SupabaseClient.client
                    .from("appointments")
                    .select(
                        Columns.raw("*, barbershops(shop_name, address), availability_slots(starts_at)")
                    ) {
                        filter { eq("client_id", userId) }
                    }
                    .decodeList<Appointment>()

                runOnUiThread {
                    if (appointments.isEmpty()) {
                        emptyView.visibility = View.VISIBLE
                        return@runOnUiThread
                    }
                    emptyView.visibility = View.GONE

                    appointments.reversed().forEach { appointment ->
                        val card = layoutInflater.inflate(R.layout.item_booking, container, false)

                        val shopName = appointment.barbershops?.shop_name ?: "Barbershop"
                        card.findViewById<TextView>(R.id.bookingBarber).text = shopName
                        card.findViewById<TextView>(R.id.bookingShop).text =
                            appointment.barbershops?.address ?: ""
                        card.findViewById<TextView>(R.id.bookingAddress).text = ""
                        card.findViewById<TextView>(R.id.bookingService).text = appointment.service

                        val whenIso = appointment.availability_slots?.starts_at ?: appointment.created_at
                        card.findViewById<TextView>(R.id.bookingDateTime).text = formatDateTime(whenIso)

                        card.findViewById<TextView>(R.id.bookingPrice).text =
                            appointment.status.replaceFirstChar { it.uppercase() }

                        container.addView(card)
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    android.widget.Toast.makeText(
                        this@BookingsActivity,
                        "Couldn't load bookings: ${e.message}",
                        android.widget.Toast.LENGTH_LONG
                    ).show()
                    emptyView.visibility = View.VISIBLE
                }
            }
        }
    }

    /** Format a Postgres timestamptz in the device's local time (java.time is API 26+, minSdk 24). */
    private fun formatDateTime(isoString: String): String {
        var s = isoString.trim()
        s = if (s.endsWith("Z")) s.dropLast(1) + "+0000"
        else Regex("([+-]\\d{2}):(\\d{2})$").replace(s) { "${it.groupValues[1]}${it.groupValues[2]}" }
        s = Regex("\\.\\d+").replace(s, "")
        val patterns = listOf(
            "yyyy-MM-dd'T'HH:mm:ssZ",
            "yyyy-MM-dd'T'HH:mmZ",
            "yyyy-MM-dd'T'HH:mm:ss"
        )
        val out = SimpleDateFormat("MMM d · h:mm a", Locale.US)
        for (p in patterns) {
            try {
                val parser = SimpleDateFormat(p, Locale.US)
                if (!p.endsWith("Z")) parser.timeZone = TimeZone.getTimeZone("UTC")
                return out.format(parser.parse(s)!!)
            } catch (_: Exception) { /* try next */ }
        }
        return isoString
    }
}
