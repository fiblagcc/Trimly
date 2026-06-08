package com.example.trimly

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.postgrest.query.filter.FilterOperator
import io.github.jan.supabase.realtime.PostgresAction
import io.github.jan.supabase.realtime.RealtimeChannel
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

@Serializable
data class MyShop(
    val id: String,
    val owner_id: String? = null,
    val shop_name: String,
    val bio: String? = null,
    val zip: String? = null,
    val address: String? = null,
    val is_active: Boolean = false,
    val subscription_status: String? = "inactive"
)

@Serializable
data class ClientRef(val full_name: String? = null, val phone: String? = null)

@Serializable
data class BarberBooking(
    val id: String,
    val service: String,
    val status: String,
    val created_at: String,
    val client_id: String? = null,
    val availability_slots: SlotRef? = null,
    val client: ClientRef? = null
)

class BarberDashboardActivity : AppCompatActivity() {

    private var shopId = ""
    private var isActive = false
    private var bookingChannel: RealtimeChannel? = null

    private data class DayHours(val dow: Int, var openMin: Int, var closeMin: Int, var closed: Boolean)
    private val week = (0..6).map { DayHours(it, 9 * 60, 17 * 60, it == 0) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_barber_dashboard)
        window.statusBarColor = Color.parseColor("#F1EFE8")

        findViewById<TextView>(R.id.logoutBtn).setOnClickListener { logout() }
        findViewById<MaterialButton>(R.id.saveShopBtn).setOnClickListener { saveShop() }
        findViewById<MaterialButton>(R.id.subToggleBtn).setOnClickListener { toggleSubscription() }
        findViewById<MaterialButton>(R.id.addSlotBtn).setOnClickListener { pickSlot() }
        findViewById<TextView>(R.id.refreshBookingsBtn).setOnClickListener { loadBookings() }
        findViewById<MaterialButton>(R.id.addServiceBtn).setOnClickListener { showServiceDialog(null) }
        findViewById<MaterialButton>(R.id.saveHoursBtn).setOnClickListener { saveHours() }

        loadShop()
    }

    override fun onResume() {
        super.onResume()
        if (shopId.isNotEmpty()) { loadServices(); loadHours(); loadSlots(); loadBookings() }
    }

    private fun loadShop() {
        lifecycleScope.launch {
            try {
                val uid = SupabaseClient.client.auth.currentSessionOrNull()?.user?.id ?: return@launch
                val shop = SupabaseClient.client.from("barbershops")
                    .select { filter { eq("owner_id", uid) } }
                    .decodeList<MyShop>()
                    .firstOrNull()

                runOnUiThread {
                    if (shop != null) {
                        shopId = shop.id
                        isActive = shop.is_active
                        findViewById<EditText>(R.id.inputShopName).setText(shop.shop_name)
                        findViewById<EditText>(R.id.inputAddress).setText(shop.address ?: "")
                        findViewById<EditText>(R.id.inputZip).setText(shop.zip ?: "")
                        findViewById<EditText>(R.id.inputBio).setText(shop.bio ?: "")
                        bindSubscription()
                        loadServices()
                        loadHours()
                        loadSlots()
                        loadBookings()
                        subscribeRealtime()
                    } else {
                        bindSubscription()
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { toast(friendlyError(e, "Couldn't load your shop")) }
            }
        }
    }

    private fun bindSubscription() {
        val badge = findViewById<TextView>(R.id.statusBadge)
        val btn = findViewById<MaterialButton>(R.id.subToggleBtn)
        if (shopId.isEmpty()) {
            badge.text = "● No shop yet"
            badge.setTextColor(Color.parseColor("#5F5E5A"))
            btn.text = "Activate"
            btn.isEnabled = false
            return
        }
        btn.isEnabled = true
        if (isActive) {
            badge.text = "● Live — clients can find you"
            badge.setTextColor(Color.parseColor("#0F6E56"))
            btn.text = "Deactivate"
        } else {
            badge.text = "● Not live — hidden from search"
            badge.setTextColor(Color.parseColor("#5F5E5A"))
            btn.text = "Activate"
        }
    }

    private fun saveShop() {
        val name = findViewById<EditText>(R.id.inputShopName).text.toString().trim()
        val address = findViewById<EditText>(R.id.inputAddress).text.toString().trim()
        val zip = findViewById<EditText>(R.id.inputZip).text.toString().trim()
        val bio = findViewById<EditText>(R.id.inputBio).text.toString().trim()
        if (name.isEmpty() || zip.isEmpty()) {
            toast("Shop name and ZIP are required")
            return
        }
        val btn = findViewById<MaterialButton>(R.id.saveShopBtn)
        btn.isEnabled = false; btn.text = "Saving..."

        lifecycleScope.launch {
            try {
                val uid = SupabaseClient.client.auth.currentSessionOrNull()?.user?.id
                    ?: throw IllegalStateException("Not signed in")

                if (shopId.isEmpty()) {
                    SupabaseClient.client.from("barbershops").insert(buildJsonObject {
                        put("owner_id", uid)
                        put("shop_name", name)
                        put("address", address)
                        put("zip", zip)
                        put("bio", bio)
                    })
                    // re-read to get the new id
                    val created = SupabaseClient.client.from("barbershops")
                        .select { filter { eq("owner_id", uid) } }
                        .decodeList<MyShop>().firstOrNull()
                    shopId = created?.id ?: ""
                    isActive = created?.is_active ?: false
                } else {
                    SupabaseClient.client.from("barbershops").update(buildJsonObject {
                        put("shop_name", name)
                        put("address", address)
                        put("zip", zip)
                        put("bio", bio)
                    }) { filter { eq("id", shopId) } }
                }

                runOnUiThread {
                    btn.isEnabled = true; btn.text = "Save shop"
                    bindSubscription()
                    toast("Shop saved")
                    if (shopId.isNotEmpty()) { loadServices(); loadHours(); loadSlots(); loadBookings(); subscribeRealtime() }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    btn.isEnabled = true; btn.text = "Save shop"
                    toast(friendlyError(e, "Couldn't save shop"))
                }
            }
        }
    }

    private fun toggleSubscription() {
        if (shopId.isEmpty()) { toast("Save your shop first"); return }
        val next = !isActive
        lifecycleScope.launch {
            try {
                SupabaseClient.client.from("barbershops").update(buildJsonObject {
                    put("is_active", next)
                    put("subscription_status", if (next) "active" else "inactive")
                }) { filter { eq("id", shopId) } }
                isActive = next
                runOnUiThread {
                    bindSubscription()
                    toast(if (next) "You're live! Clients can book you." else "Subscription paused. Shop hidden.")
                }
            } catch (e: Exception) {
                runOnUiThread { toast(friendlyError(e, "Couldn't update subscription")) }
            }
        }
    }

    // ---- Availability ----

    private fun pickSlot() {
        if (shopId.isEmpty()) { toast("Save your shop first"); return }
        val now = Calendar.getInstance()
        DatePickerDialog(this, { _, y, mo, d ->
            val cal = Calendar.getInstance()
            TimePickerDialog(this, { _, h, mi ->
                cal.set(y, mo, d, h, mi, 0)
                cal.set(Calendar.MILLISECOND, 0)
                if (cal.timeInMillis <= System.currentTimeMillis()) {
                    toast("Pick a future time")
                } else {
                    addSlot(cal.time)
                }
            }, now.get(Calendar.HOUR_OF_DAY), 0, false).show()
        }, now.get(Calendar.YEAR), now.get(Calendar.MONTH), now.get(Calendar.DAY_OF_MONTH)).show()
    }

    private fun addSlot(date: Date) {
        lifecycleScope.launch {
            try {
                SupabaseClient.client.from("availability_slots").insert(buildJsonObject {
                    put("barbershop_id", shopId)
                    put("starts_at", isoUtc(date))
                    put("duration_min", 30)
                    put("is_booked", false)
                })
                runOnUiThread { toast("Slot added"); loadSlots() }
            } catch (e: Exception) {
                runOnUiThread { toast(friendlyError(e, "Couldn't add slot")) }
            }
        }
    }

    private fun deleteSlot(id: String) {
        lifecycleScope.launch {
            try {
                SupabaseClient.client.from("availability_slots").delete { filter { eq("id", id) } }
                runOnUiThread { loadSlots() }
            } catch (e: Exception) {
                runOnUiThread { toast(friendlyError(e, "Couldn't delete slot")) }
            }
        }
    }

    private fun loadSlots() {
        if (shopId.isEmpty()) return
        lifecycleScope.launch {
            try {
                val nowIso = isoUtc(Date())
                val slots = SupabaseClient.client.from("availability_slots")
                    .select {
                        filter { eq("barbershop_id", shopId); gt("starts_at", nowIso) }
                        order("starts_at", Order.ASCENDING)
                    }
                    .decodeList<Slot>()
                runOnUiThread { renderSlots(slots) }
            } catch (e: Exception) {
                runOnUiThread { renderSlots(emptyList()) }
            }
        }
    }

    private fun renderSlots(slots: List<Slot>) {
        val container = findViewById<LinearLayout>(R.id.slotsContainer)
        val empty = findViewById<TextView>(R.id.slotsEmpty)
        container.removeAllViews()
        empty.visibility = if (slots.isEmpty()) View.VISIBLE else View.GONE
        slots.forEach { slot ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, dp(8), 0, dp(8))
            }
            row.addView(TextView(this).apply {
                text = formatDateTime(slot.starts_at)
                setTextColor(Color.parseColor("#1A1A1A"))
                textSize = 14f
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            })
            if (slot.is_booked) {
                row.addView(TextView(this).apply {
                    text = "Booked"
                    setTextColor(Color.parseColor("#0F6E56"))
                    textSize = 12f
                })
            } else {
                row.addView(TextView(this).apply {
                    text = "Remove"
                    setTextColor(Color.parseColor("#B91C1C"))
                    textSize = 13f
                    setPadding(dp(10), dp(4), dp(4), dp(4))
                    setOnClickListener { deleteSlot(slot.id) }
                })
            }
            container.addView(row)
        }
    }

    // ---- Services ----

    private fun loadServices() {
        if (shopId.isEmpty()) return
        lifecycleScope.launch {
            try {
                val list = SupabaseClient.client.from("services")
                    .select { filter { eq("barbershop_id", shopId) } }
                    .decodeList<Service>()
                runOnUiThread { renderServices(list) }
            } catch (e: Exception) {
                runOnUiThread { renderServices(emptyList()) }
            }
        }
    }

    private fun renderServices(list: List<Service>) {
        val container = findViewById<LinearLayout>(R.id.servicesContainer)
        val empty = findViewById<TextView>(R.id.servicesEmpty)
        container.removeAllViews()
        empty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
        list.forEach { s ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, dp(8), 0, dp(8))
            }
            row.addView(TextView(this).apply {
                text = s.name
                setTextColor(Color.parseColor("#1A1A1A")); textSize = 14f
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            })
            row.addView(TextView(this).apply {
                text = (if (s.price_cents > 0) "$" + "%.2f".format(s.price_cents / 100.0) else "—") + "  ·  ${s.duration_min}m"
                setTextColor(Color.parseColor("#0F6E56")); textSize = 13f
                setPadding(0, 0, dp(10), 0)
            })
            row.addView(TextView(this).apply {
                text = "Edit"
                setTextColor(Color.parseColor("#1D9E75")); textSize = 13f
                setPadding(dp(4), dp(4), dp(6), dp(4))
                setOnClickListener { showServiceDialog(s) }
            })
            row.addView(TextView(this).apply {
                text = "✕"
                setTextColor(Color.parseColor("#B91C1C")); textSize = 14f
                setPadding(dp(6), dp(4), dp(2), dp(4))
                setOnClickListener { deleteService(s.id) }
            })
            container.addView(row)
        }
    }

    private fun showServiceDialog(existing: Service?) {
        if (shopId.isEmpty()) { toast("Save your shop first"); return }
        val pad = dp(20)
        val nameIn = EditText(this).apply { hint = "Service name"; setText(existing?.name ?: ""); setSingleLine() }
        val priceIn = EditText(this).apply {
            hint = "Price (e.g. 25)"
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            if (existing != null && existing.price_cents > 0) setText((existing.price_cents / 100.0).toString())
        }
        val durIn = EditText(this).apply {
            hint = "Duration min (e.g. 30)"
            inputType = InputType.TYPE_CLASS_NUMBER
            setText((existing?.duration_min ?: 30).toString())
        }
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad / 2, pad, 0)
            addView(nameIn); addView(priceIn); addView(durIn)
        }
        AlertDialog.Builder(this)
            .setTitle(if (existing == null) "Add service" else "Edit service")
            .setView(layout)
            .setPositiveButton("Save") { _, _ ->
                val name = nameIn.text.toString().trim()
                val priceCents = ((priceIn.text.toString().toDoubleOrNull() ?: 0.0) * 100).toInt()
                val dur = durIn.text.toString().toIntOrNull() ?: 30
                if (name.isEmpty()) toast("Name required") else saveService(existing?.id, name, priceCents, dur)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun saveService(id: String?, name: String, priceCents: Int, durMin: Int) {
        lifecycleScope.launch {
            try {
                if (id == null) {
                    SupabaseClient.client.from("services").insert(buildJsonObject {
                        put("barbershop_id", shopId); put("name", name)
                        put("price_cents", priceCents); put("duration_min", durMin); put("is_active", true)
                    })
                } else {
                    SupabaseClient.client.from("services").update(buildJsonObject {
                        put("name", name); put("price_cents", priceCents); put("duration_min", durMin)
                    }) { filter { eq("id", id) } }
                }
                runOnUiThread { toast("Saved"); loadServices() }
            } catch (e: Exception) {
                runOnUiThread { toast(friendlyError(e, "Couldn't save service")) }
            }
        }
    }

    private fun deleteService(id: String) {
        lifecycleScope.launch {
            try {
                SupabaseClient.client.from("services").delete { filter { eq("id", id) } }
                runOnUiThread { loadServices() }
            } catch (e: Exception) {
                runOnUiThread { toast(friendlyError(e, "Couldn't delete")) }
            }
        }
    }

    // ---- Incoming bookings ----

    private fun loadBookings() {
        if (shopId.isEmpty()) return
        lifecycleScope.launch {
            try {
                val list = SupabaseClient.client.from("appointments")
                    .select(
                        Columns.raw("*, availability_slots(starts_at), client:profiles!appointments_client_id_fkey(full_name, phone)")
                    ) {
                        filter { eq("barbershop_id", shopId) }
                        order("created_at", Order.DESCENDING)
                    }
                    .decodeList<BarberBooking>()
                runOnUiThread { renderBookings(list) }
            } catch (e: Exception) {
                runOnUiThread { renderBookings(emptyList()) }
            }
        }
    }

    private fun renderBookings(list: List<BarberBooking>) {
        val container = findViewById<LinearLayout>(R.id.bookingsContainer)
        val empty = findViewById<TextView>(R.id.bookingsEmpty)
        container.removeAllViews()
        empty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
        list.forEach { b ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(0, dp(10), 0, dp(10))
                isClickable = true
                setOnClickListener { showBookingActions(b) }
            }
            row.addView(TextView(this).apply {
                text = (b.client?.full_name ?: "Client") + "  ·  " + b.service
                setTextColor(Color.parseColor("#1A1A1A"))
                textSize = 14f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            })
            val whenIso = b.availability_slots?.starts_at ?: b.created_at
            row.addView(TextView(this).apply {
                text = formatDateTime(whenIso) + "  •  " + b.status.replaceFirstChar { it.uppercase() }
                setTextColor(statusColor(b.status))
                textSize = 12f
            })
            container.addView(row)
        }
    }

    private fun statusColor(status: String): Int = when (status.lowercase()) {
        "cancelled" -> Color.parseColor("#B91C1C")
        "completed" -> Color.parseColor("#0F6E56")
        else -> Color.parseColor("#5B5A55")
    }

    private fun showBookingActions(b: BarberBooking) {
        val labels = mutableListOf("Mark completed", "Cancel booking")
        if (!b.client?.phone.isNullOrBlank()) labels.add("Call client")
        AlertDialog.Builder(this)
            .setTitle(b.client?.full_name ?: "Booking")
            .setItems(labels.toTypedArray()) { _, which ->
                when (labels[which]) {
                    "Mark completed" -> updateStatus(b.id, "completed")
                    "Cancel booking" -> updateStatus(b.id, "cancelled")
                    "Call client" -> b.client?.phone?.let { callClient(it) }
                }
            }
            .setNegativeButton("Close", null)
            .show()
    }

    private fun updateStatus(id: String, status: String) {
        lifecycleScope.launch {
            try {
                SupabaseClient.client.from("appointments").update(buildJsonObject {
                    put("status", status)
                }) { filter { eq("id", id) } }
                runOnUiThread { toast("Marked $status"); loadBookings() }
            } catch (e: Exception) {
                runOnUiThread { toast(friendlyError(e, "Couldn't update")) }
            }
        }
    }

    private fun callClient(phone: String) {
        try {
            startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
        } catch (e: Exception) {
            toast("Couldn't open dialer")
        }
    }

    private fun logout() {
        lifecycleScope.launch {
            try { SupabaseClient.client.auth.signOut() } catch (_: Exception) {}
            getSharedPreferences("TrimlyPrefs", MODE_PRIVATE).edit().clear().apply()
            runOnUiThread {
                val i = Intent(this@BarberDashboardActivity, MainActivity::class.java)
                i.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(i); finish()
            }
        }
    }

    // ---- Opening hours ----

    private fun loadHours() {
        if (shopId.isEmpty()) return
        lifecycleScope.launch {
            try {
                val rows = SupabaseClient.client.from("business_hours")
                    .select { filter { eq("barbershop_id", shopId) } }
                    .decodeList<BusinessHour>()
                week.forEach { d ->
                    val r = rows.firstOrNull { it.day_of_week == d.dow }
                    if (r != null) {
                        d.closed = r.is_closed || r.open_time == null || r.close_time == null
                        parseToMin(r.open_time)?.let { d.openMin = it }
                        parseToMin(r.close_time)?.let { d.closeMin = it }
                    }
                }
                runOnUiThread { renderHours() }
            } catch (e: Exception) {
                runOnUiThread { renderHours() }
            }
        }
    }

    private fun renderHours() {
        val container = findViewById<LinearLayout>(R.id.hoursContainer)
        container.removeAllViews()
        val names = arrayOf("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")
        week.forEach { d ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, dp(8), 0, dp(8))
            }
            row.addView(TextView(this).apply {
                text = names[d.dow]
                setTextColor(Color.parseColor("#1A1A1A")); textSize = 14f
                width = dp(92)
            })
            row.addView(TextView(this).apply {
                if (d.closed) { text = "Closed"; setTextColor(Color.parseColor("#9A988F")) }
                else { text = "${minLabel(d.openMin)} – ${minLabel(d.closeMin)}"; setTextColor(Color.parseColor("#1A1A1A")) }
                textSize = 13f
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                setOnClickListener { if (!d.closed) pickHours(d) }
            })
            row.addView(TextView(this).apply {
                text = if (d.closed) "Set open" else "Set closed"
                setTextColor(Color.parseColor("#1D9E75")); textSize = 12f
                setPadding(dp(8), dp(4), dp(2), dp(4))
                setOnClickListener { d.closed = !d.closed; renderHours() }
            })
            container.addView(row)
        }
    }

    private fun pickHours(d: DayHours) {
        TimePickerDialog(this, { _, h, mi ->
            d.openMin = h * 60 + mi
            TimePickerDialog(this, { _, h2, mi2 ->
                d.closeMin = h2 * 60 + mi2
                renderHours()
            }, d.closeMin / 60, d.closeMin % 60, false).show()
        }, d.openMin / 60, d.openMin % 60, false).show()
    }

    private fun saveHours() {
        if (shopId.isEmpty()) { toast("Save your shop first"); return }
        if (week.any { !it.closed && it.closeMin <= it.openMin }) {
            toast("Close time must be after open time"); return
        }
        lifecycleScope.launch {
            try {
                SupabaseClient.client.from("business_hours").delete { filter { eq("barbershop_id", shopId) } }
                val rows = week.map { d ->
                    buildJsonObject {
                        put("barbershop_id", shopId)
                        put("day_of_week", d.dow)
                        // open_time/close_time are NOT NULL, so always send valid times.
                        if (d.closed) {
                            put("is_closed", true)
                            put("open_time", "09:00:00")
                            put("close_time", "17:00:00")
                        } else {
                            put("is_closed", false)
                            put("open_time", minTime(d.openMin))
                            put("close_time", minTime(d.closeMin))
                        }
                    }
                }
                SupabaseClient.client.from("business_hours").insert(rows)
                runOnUiThread { toast("Hours saved") }
            } catch (e: Exception) {
                runOnUiThread { toast(friendlyError(e, "Couldn't save hours")) }
            }
        }
    }

    private fun minLabel(min: Int): String {
        val c = Calendar.getInstance()
        c.set(Calendar.HOUR_OF_DAY, min / 60); c.set(Calendar.MINUTE, min % 60)
        return SimpleDateFormat("h:mm a", Locale.US).format(c.time)
    }

    private fun minTime(min: Int): String = String.format(Locale.US, "%02d:%02d:00", min / 60, min % 60)

    private fun parseToMin(t: String?): Int? {
        if (t == null) return null
        val p = t.split(":")
        return try { p[0].toInt() * 60 + p[1].toInt() } catch (e: Exception) { null }
    }

    // ---- Realtime: live bookings ----

    private fun subscribeRealtime() {
        if (bookingChannel != null || shopId.isEmpty()) return
        val channel = SupabaseClient.client.channel("appointments-$shopId")
        bookingChannel = channel
        channel.postgresChangeFlow<PostgresAction.Insert>(schema = "public") {
            table = "appointments"
            filter("barbershop_id", FilterOperator.EQ, shopId)
        }.onEach {
            runOnUiThread { notifyNewBooking(); loadBookings() }
        }.launchIn(lifecycleScope)
        lifecycleScope.launch { try { channel.subscribe() } catch (_: Exception) {} }
    }

    private fun notifyNewBooking() {
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            RingtoneManager.getRingtone(applicationContext, uri)?.play()
        } catch (_: Exception) {}
        try {
            val vib = getSystemService(VIBRATOR_SERVICE) as? Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vib?.vibrate(VibrationEffect.createOneShot(350, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION") vib?.vibrate(350)
            }
        } catch (_: Exception) {}
        toast("🔔 New booking just came in!")
    }

    // ---- helpers ----

    private fun toast(m: String) = Toast.makeText(this, m, Toast.LENGTH_SHORT).show()
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun isoUtc(date: Date): String {
        val f = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        f.timeZone = TimeZone.getTimeZone("UTC")
        return f.format(date)
    }

    private fun formatDateTime(iso: String): String {
        var s = iso.trim()
        s = if (s.endsWith("Z")) s.dropLast(1) + "+0000"
        else Regex("([+-]\\d{2}):(\\d{2})$").replace(s) { "${it.groupValues[1]}${it.groupValues[2]}" }
        s = Regex("\\.\\d+").replace(s, "")
        val out = SimpleDateFormat("EEE, MMM d • h:mm a", Locale.US)
        for (p in listOf("yyyy-MM-dd'T'HH:mm:ssZ", "yyyy-MM-dd'T'HH:mm:ss")) {
            try {
                val parser = SimpleDateFormat(p, Locale.US)
                if (!p.endsWith("Z")) parser.timeZone = TimeZone.getTimeZone("UTC")
                return out.format(parser.parse(s)!!)
            } catch (_: Exception) {}
        }
        return iso
    }
}
