package com.example.trimly

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
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
data class Slot(
    val id: String,
    val barbershop_id: String,
    val starts_at: String,
    val duration_min: Int = 30,
    val is_booked: Boolean = false
)

class BookingActivity : AppCompatActivity() {

    private var selectedServices = mutableMapOf<String, Int>()
    private var barberName = "Barber"
    private var shopName = "Barbershop"
    private var barbershopId = ""

    // Slots grouped by local date key (yyyy-MM-dd), each list sorted by time.
    private val slotsByDate = linkedMapOf<String, MutableList<Slot>>()
    private var selectedDateKey: String? = null
    private var daySlots = listOf<Slot>()
    private var selectedSlotId = ""
    private var selectedSlotLabel = ""

    // The month currently shown in the calendar grid.
    private val displayed = Calendar.getInstance()

    private val dateKeyFmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)   // device-local date
    private val monthFmt = SimpleDateFormat("MMMM yyyy", Locale.US)
    private val timeFmt = SimpleDateFormat("h:mm a", Locale.US)
    private val fullFmt = SimpleDateFormat("EEE, MMM d · h:mm a", Locale.US)

    private val calRowIds = listOf(R.id.calRow1, R.id.calRow2, R.id.calRow3, R.id.calRow4, R.id.calRow5)
    private val timeViewIds = listOf(
        R.id.time1, R.id.time2, R.id.time3, R.id.time4,
        R.id.time5, R.id.time6, R.id.time7, R.id.time8
    )

    private val serviceData = mapOf(
        R.id.serviceFade to Pair("Fade", 25),
        R.id.serviceBeard to Pair("Beard Trim", 15),
        R.id.serviceFullCut to Pair("Full Cut", 35),
        R.id.serviceLineup to Pair("Lineup", 20)
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_booking)

        window.statusBarColor = Color.parseColor("#F1EFE8")

        barberName = intent.getStringExtra("BARBER_NAME") ?: "Barber"
        shopName = intent.getStringExtra("SHOP_NAME") ?: "Barbershop"
        barbershopId = intent.getStringExtra("BARBERSHOP_ID") ?: ""
        val serviceName = intent.getStringExtra("SERVICE_NAME")

        findViewById<TextView>(R.id.barberName).text = barberName
        findViewById<TextView>(R.id.shopName).text = shopName

        val seeded = serviceData.values.firstOrNull { it.first.equals(serviceName, ignoreCase = true) }
        if (seeded != null) selectedServices[seeded.first] = seeded.second
        else selectedServices["Fade"] = 25

        setupBackButton()
        setupServices()
        setupMonthNav()
        setupConfirmButton()
        updateSummary()
        loadSlots()
    }

    private fun setupBackButton() {
        findViewById<CardView>(R.id.backBtn).setOnClickListener { finish() }
    }

    private fun setupMonthNav() {
        findViewById<TextView>(R.id.calPrev).setOnClickListener {
            // Don't page earlier than the current month.
            val now = Calendar.getInstance()
            if (displayed.get(Calendar.YEAR) > now.get(Calendar.YEAR) ||
                (displayed.get(Calendar.YEAR) == now.get(Calendar.YEAR) &&
                    displayed.get(Calendar.MONTH) > now.get(Calendar.MONTH))
            ) {
                displayed.add(Calendar.MONTH, -1)
                onMonthChanged()
            }
        }
        findViewById<TextView>(R.id.calNext).setOnClickListener {
            displayed.add(Calendar.MONTH, 1)
            onMonthChanged()
        }
    }

    private fun onMonthChanged() {
        selectedDateKey = firstAvailableInDisplayedMonth()
        renderCalendar()
        renderTimes()
    }

    private fun loadSlots() {
        if (barbershopId.isEmpty()) {
            renderCalendar(); showNoSlots(); return
        }
        lifecycleScope.launch {
            try {
                val nowIso = isoUtc(Date())
                val result = SupabaseClient.client.from("availability_slots")
                    .select {
                        filter {
                            eq("barbershop_id", barbershopId)
                            eq("is_booked", false)
                            gt("starts_at", nowIso)
                        }
                        order("starts_at", Order.ASCENDING)
                    }
                    .decodeList<Slot>()

                runOnUiThread {
                    slotsByDate.clear()
                    for (s in result) {
                        val d = parseIso(s.starts_at) ?: continue
                        val key = dateKeyFmt.format(d)
                        slotsByDate.getOrPut(key) { mutableListOf() }.add(s)
                    }
                    // Jump to the first date that actually has openings.
                    val firstDate = result.firstOrNull()?.let { parseIso(it.starts_at) }
                    if (firstDate != null) {
                        displayed.time = firstDate
                        selectedDateKey = dateKeyFmt.format(firstDate)
                    } else {
                        selectedDateKey = null
                    }
                    renderCalendar()
                    renderTimes()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@BookingActivity, "Couldn't load times: ${e.message}", Toast.LENGTH_LONG).show()
                    renderCalendar(); showNoSlots()
                }
            }
        }
    }

    private fun cells(): List<TextView> =
        calRowIds.flatMap { rowId ->
            val row = findViewById<LinearLayout>(rowId)
            (0 until row.childCount).map { row.getChildAt(it) as TextView }
        }

    private fun renderCalendar() {
        val month = displayed.clone() as Calendar
        month.set(Calendar.DAY_OF_MONTH, 1)
        val firstWeekday = month.get(Calendar.DAY_OF_WEEK) // Sunday = 1
        val daysInMonth = month.getActualMaximum(Calendar.DAY_OF_MONTH)
        findViewById<TextView>(R.id.calMonthLabel).text = monthFmt.format(month.time)

        val today = dateKeyFmt.format(Date())
        val cellViews = cells()

        cellViews.forEachIndexed { i, cell ->
            val dayNum = i - (firstWeekday - 1) + 1
            if (dayNum in 1..daysInMonth) {
                val dayCal = displayed.clone() as Calendar
                dayCal.set(Calendar.DAY_OF_MONTH, dayNum)
                val key = dateKeyFmt.format(dayCal.time)
                cell.text = dayNum.toString()

                val hasSlots = slotsByDate.containsKey(key)
                val isPast = key < today

                when {
                    hasSlots && !isPast -> {
                        cell.isClickable = true
                        if (key == selectedDateKey) {
                            cell.setBackgroundResource(R.drawable.bg_date_selected)
                            cell.setTextColor(Color.WHITE)
                        } else {
                            cell.background = null
                            cell.setTextColor(Color.parseColor("#1A1A1A"))
                        }
                        cell.setOnClickListener {
                            selectedDateKey = key
                            renderCalendar()
                            renderTimes()
                        }
                    }
                    else -> {
                        // Past days or days with no availability: shown but not selectable.
                        cell.background = null
                        cell.setTextColor(Color.parseColor("#C9C7BE"))
                        cell.isClickable = false
                        cell.setOnClickListener(null)
                    }
                }
            } else {
                cell.text = ""
                cell.background = null
                cell.isClickable = false
                cell.setOnClickListener(null)
            }
        }
    }

    private fun firstAvailableInDisplayedMonth(): String? {
        val ym = SimpleDateFormat("yyyy-MM", Locale.US).format(displayed.time)
        val today = dateKeyFmt.format(Date())
        return slotsByDate.keys.sorted().firstOrNull { it.startsWith(ym) && it >= today }
    }

    private fun renderTimes() {
        daySlots = selectedDateKey?.let { slotsByDate[it] }?.take(timeViewIds.size) ?: emptyList()
        val confirmBtn = findViewById<MaterialButton>(R.id.confirmBtn)

        if (daySlots.isEmpty()) {
            selectedSlotId = ""
            selectedSlotLabel = ""
            timeViewIds.forEach { findViewById<TextView>(it).visibility = View.GONE }
            findViewById<TextView>(R.id.noSlotsText).visibility = View.VISIBLE
            confirmBtn.isEnabled = false
            updateSummary()
            return
        }

        findViewById<TextView>(R.id.noSlotsText).visibility = View.GONE
        confirmBtn.isEnabled = true

        // Default to the first time of the chosen day.
        selectedSlotId = daySlots[0].id
        selectedSlotLabel = fullLabel(daySlots[0].starts_at)

        timeViewIds.forEachIndexed { i, viewId ->
            val view = findViewById<TextView>(viewId)
            if (i < daySlots.size) {
                val slot = daySlots[i]
                view.visibility = View.VISIBLE
                view.text = timeLabel(slot.starts_at)
                view.setOnClickListener {
                    selectedSlotId = slot.id
                    selectedSlotLabel = fullLabel(slot.starts_at)
                    updateTimeUI()
                    updateSummary()
                }
            } else {
                view.visibility = View.GONE
            }
        }
        updateTimeUI()
        updateSummary()
    }

    private fun showNoSlots() {
        daySlots = emptyList()
        selectedSlotId = ""
        selectedSlotLabel = ""
        timeViewIds.forEach { findViewById<TextView>(it).visibility = View.GONE }
        findViewById<TextView>(R.id.noSlotsText).visibility = View.VISIBLE
        findViewById<MaterialButton>(R.id.confirmBtn).isEnabled = false
        updateSummary()
    }

    private fun updateTimeUI() {
        timeViewIds.forEachIndexed { i, viewId ->
            if (i >= daySlots.size) return@forEachIndexed
            val view = findViewById<TextView>(viewId)
            if (daySlots[i].id == selectedSlotId) {
                view.setBackgroundResource(R.drawable.bg_service_active)
                view.setTextColor(Color.parseColor("#1D9E75"))
            } else {
                view.setBackgroundResource(R.drawable.bg_cat_inactive)
                view.setTextColor(Color.parseColor("#5B5A55"))
            }
        }
    }

    private fun setupConfirmButton() {
        val confirmBtn = findViewById<MaterialButton>(R.id.confirmBtn)
        confirmBtn.text = "Continue"
        confirmBtn.setOnClickListener {
            if (selectedSlotId.isEmpty()) {
                Toast.makeText(this, "Please pick a date and time", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            // Hand off to the cart/checkout screen, which performs the booking.
            val intent = Intent(this, CheckoutActivity::class.java)
            intent.putExtra("SLOT_ID", selectedSlotId)
            intent.putExtra("SLOT_LABEL", selectedSlotLabel)
            intent.putExtra("SHOP_NAME", shopName)
            intent.putStringArrayListExtra("SERVICE_NAMES", ArrayList(selectedServices.keys))
            intent.putIntegerArrayListExtra("SERVICE_PRICES", ArrayList(selectedServices.values))
            startActivity(intent)
        }
    }

    private fun setupServices() {
        serviceData.forEach { (id, info) ->
            val layout = findViewById<LinearLayout>(id)
            layout.setOnClickListener {
                val name = info.first
                val price = info.second
                if (selectedServices.containsKey(name)) {
                    if (selectedServices.size > 1) selectedServices.remove(name)
                } else {
                    selectedServices[name] = price
                }
                updateServiceUI()
                updateSummary()
            }
        }
        updateServiceUI()
    }

    private fun updateServiceUI() {
        serviceData.forEach { (id, info) ->
            val layout = findViewById<LinearLayout>(id)
            val nameText = layout.getChildAt(0) as TextView
            val priceText = layout.getChildAt(1) as TextView
            if (selectedServices.containsKey(info.first)) {
                layout.setBackgroundResource(R.drawable.bg_service_active)
                nameText.setTextColor(Color.parseColor("#1D9E75"))
                priceText.setTextColor(Color.parseColor("#1D9E75"))
            } else {
                layout.setBackgroundResource(R.drawable.bg_cat_inactive)
                nameText.setTextColor(Color.parseColor("#5B5A55"))
                priceText.setTextColor(Color.parseColor("#5B5A55"))
            }
        }
    }

    private fun updateSummary() {
        val totalPrice = selectedServices.values.sum()
        val serviceNames = selectedServices.keys.joinToString(" + ")
        findViewById<TextView>(R.id.summaryService).text = "$serviceNames · \$$totalPrice"
        findViewById<TextView>(R.id.summaryDateTime).text =
            if (selectedSlotLabel.isNotEmpty()) selectedSlotLabel else "Pick a time"
    }

    // ---- timestamp helpers (java.time is API 26+, minSdk is 24) ----

    private fun isoUtc(date: Date): String {
        val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        fmt.timeZone = TimeZone.getTimeZone("UTC")
        return fmt.format(date)
    }

    private fun timeLabel(isoString: String): String =
        parseIso(isoString)?.let { timeFmt.format(it) } ?: isoString

    private fun fullLabel(isoString: String): String =
        parseIso(isoString)?.let { fullFmt.format(it) } ?: isoString

    private fun parseIso(isoString: String): Date? {
        var s = isoString.trim()
        s = if (s.endsWith("Z")) s.dropLast(1) + "+0000"
        else Regex("([+-]\\d{2}):(\\d{2})$").replace(s) { "${it.groupValues[1]}${it.groupValues[2]}" }
        s = Regex("\\.\\d+").replace(s, "")
        val patterns = listOf(
            "yyyy-MM-dd'T'HH:mm:ssZ",
            "yyyy-MM-dd'T'HH:mmZ",
            "yyyy-MM-dd'T'HH:mm:ss"
        )
        for (p in patterns) {
            try {
                val parser = SimpleDateFormat(p, Locale.US)
                if (!p.endsWith("Z")) parser.timeZone = TimeZone.getTimeZone("UTC")
                return parser.parse(s)
            } catch (_: Exception) { /* try next */ }
        }
        return null
    }
}
