package com.example.trimly

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.AppCompatImageView
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
import java.util.Locale

@Serializable
data class Service(
    val id: String,
    val barbershop_id: String,
    val name: String,
    val price_cents: Int,
    val duration_min: Int = 30,
    val is_active: Boolean = true
)

@Serializable
data class Review(
    val id: String,
    val rating: Int,
    val comment: String? = null,
    val created_at: String? = null
)

@Serializable
data class BusinessHour(
    val day_of_week: Int,
    val open_time: String? = null,
    val close_time: String? = null,
    val is_closed: Boolean = false
)

class BarbershopActivity : AppCompatActivity() {

    private var shopId = ""
    private var shopName = "Barbershop"

    private var services = listOf<Service>()
    private var reviews = listOf<Review>()
    private var hours = listOf<BusinessHour>()

    private var currentTab = "Services"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_barbershop)

        window.statusBarColor = Color.parseColor("#0F6E56")

        shopId = intent.getStringExtra("SHOP_ID") ?: ""

        findViewById<CardView>(R.id.backBtn).setOnClickListener { finish() }

        setupTabs()
        setupFavorite()
        loadShop()
    }

    private fun loadShop() {
        if (shopId.isEmpty()) {
            Toast.makeText(this, "Shop not found", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        lifecycleScope.launch {
            try {
                val shop = SupabaseClient.client.from("barbershops")
                    .select { filter { eq("id", shopId) } }
                    .decodeSingleOrNull<Shop>()

                if (shop == null) {
                    runOnUiThread {
                        Toast.makeText(this@BarbershopActivity, "Shop not available", Toast.LENGTH_LONG).show()
                        finish()
                    }
                    return@launch
                }
                shopName = shop.shop_name

                val rating = try {
                    SupabaseClient.client.from("barbershop_ratings")
                        .select { filter { eq("barbershop_id", shopId) } }
                        .decodeSingleOrNull<ShopRating>()
                } catch (e: Exception) { null }

                val openNow = try {
                    SupabaseClient.client.postgrest.rpc(
                        "shop_open_now",
                        buildJsonObject { put("shop_id", shopId) }
                    ).decodeAs<Boolean>()
                } catch (e: Exception) { false }

                services = try {
                    SupabaseClient.client.from("services")
                        .select { filter { eq("barbershop_id", shopId); eq("is_active", true) } }
                        .decodeList<Service>()
                } catch (e: Exception) { emptyList() }

                reviews = try {
                    SupabaseClient.client.from("reviews")
                        .select {
                            filter { eq("barbershop_id", shopId) }
                            order("created_at", Order.DESCENDING)
                        }
                        .decodeList<Review>()
                } catch (e: Exception) { emptyList() }

                hours = try {
                    SupabaseClient.client.from("business_hours")
                        .select {
                            filter { eq("barbershop_id", shopId) }
                            order("day_of_week", Order.ASCENDING)
                        }
                        .decodeList<BusinessHour>()
                } catch (e: Exception) { emptyList() }

                runOnUiThread { bindHeader(shop, rating, openNow); renderTab() }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@BarbershopActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun bindHeader(shop: Shop, rating: ShopRating?, openNow: Boolean) {
        findViewById<TextView>(R.id.shopName).text = shop.shop_name
        findViewById<TextView>(R.id.shopAddress).text = shop.address ?: (shop.bio ?: "")

        findViewById<TextView>(R.id.ratingBadge).text =
            if (rating?.avg_rating != null) "⭐ ${rating.avg_rating} (${rating.review_count})" else "⭐ New"

        val statusBadge = findViewById<TextView>(R.id.statusBadge)
        if (openNow) {
            statusBadge.text = "● Open"
            statusBadge.setTextColor(Color.parseColor("#0F6E56"))
            statusBadge.setBackgroundResource(R.drawable.bg_badge_open)
        } else {
            statusBadge.text = "● Closed"
            statusBadge.setTextColor(Color.parseColor("#B91C1C"))
            statusBadge.setBackgroundResource(R.drawable.bg_badge_closed)
        }
    }

    // ---- Tabs ----

    private fun setupTabs() {
        findViewById<TextView>(R.id.tabServices).setOnClickListener { currentTab = "Services"; updateTabUi(); renderTab() }
        findViewById<TextView>(R.id.tabReviews).setOnClickListener { currentTab = "Reviews"; updateTabUi(); renderTab() }
        findViewById<TextView>(R.id.tabAbout).setOnClickListener { currentTab = "About"; updateTabUi(); renderTab() }
        updateTabUi()
    }

    private fun updateTabUi() {
        val tabs = mapOf(
            R.id.tabServices to "Services",
            R.id.tabReviews to "Reviews",
            R.id.tabAbout to "About"
        )
        tabs.forEach { (id, name) ->
            val v = findViewById<TextView>(id)
            if (name == currentTab) {
                v.setBackgroundResource(R.drawable.bg_cat_active)
                v.setTextColor(Color.WHITE)
            } else {
                v.setBackgroundResource(R.drawable.bg_cat_inactive)
                v.setTextColor(Color.parseColor("#5B5A55"))
            }
        }
    }

    private fun renderTab() {
        val container = findViewById<LinearLayout>(R.id.contentContainer)
        container.removeAllViews()
        when (currentTab) {
            "Services" -> renderServices(container)
            "Reviews" -> renderReviews(container)
            "About" -> renderAbout(container)
        }
    }

    private fun renderServices(container: LinearLayout) {
        val list = if (services.isNotEmpty()) services
        else listOf(Service(id = "", barbershop_id = shopId, name = "Haircut", price_cents = 0))

        list.forEach { s ->
            val row = layoutInflater.inflate(R.layout.item_service, container, false)
            row.findViewById<TextView>(R.id.serviceName).text = s.name
            row.findViewById<TextView>(R.id.serviceMeta).text = "${s.duration_min} min"
            row.findViewById<TextView>(R.id.servicePrice).text =
                if (s.price_cents > 0) "$${"%.2f".format(s.price_cents / 100.0)}" else "—"
            row.findViewById<MaterialButton>(R.id.serviceBook).setOnClickListener { openBooking(s.name) }
            container.addView(row)
        }
    }

    private fun renderReviews(container: LinearLayout) {
        if (reviews.isEmpty()) {
            container.addView(emptyText("No reviews yet."))
            return
        }
        val dateOut = SimpleDateFormat("MMM d, yyyy", Locale.US)
        reviews.forEach { r ->
            val row = layoutInflater.inflate(R.layout.item_review, container, false)
            val stars = "★".repeat(r.rating.coerceIn(0, 5)) + "☆".repeat((5 - r.rating).coerceIn(0, 5))
            row.findViewById<TextView>(R.id.reviewStars).text = stars
            row.findViewById<TextView>(R.id.reviewDate).text = formatDate(r.created_at, dateOut)
            val comment = row.findViewById<TextView>(R.id.reviewComment)
            if (r.comment.isNullOrBlank()) comment.visibility = View.GONE
            else comment.text = r.comment
            container.addView(row)
        }
    }

    private fun renderAbout(container: LinearLayout) {
        val pad = (16 * resources.displayMetrics.density).toInt()
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.bg_card)
            setPadding(pad, pad, pad, pad)
        }

        val shopAddr = findViewById<TextView>(R.id.shopAddress).text?.toString().orEmpty()
        if (shopAddr.isNotBlank()) {
            card.addView(label("Address"))
            card.addView(body(shopAddr))
        }

        card.addView(label("Opening hours").apply { setPadding(0, pad / 2, 0, 0) })
        if (hours.isEmpty()) {
            card.addView(body("Hours not set."))
        } else {
            val days = arrayOf("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")
            val tIn = SimpleDateFormat("HH:mm:ss", Locale.US)
            val tInShort = SimpleDateFormat("HH:mm", Locale.US)
            val tOut = SimpleDateFormat("h:mm a", Locale.US)
            hours.sortedBy { it.day_of_week }.forEach { h ->
                val dayName = days.getOrElse(h.day_of_week) { "Day ${h.day_of_week}" }
                val value = if (h.is_closed || h.open_time == null || h.close_time == null) {
                    "Closed"
                } else {
                    val o = parseTime(h.open_time, tIn, tInShort, tOut)
                    val c = parseTime(h.close_time, tIn, tInShort, tOut)
                    "$o - $c"
                }
                val rowLayout = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    setPadding(0, (4 * resources.displayMetrics.density).toInt(), 0, (4 * resources.displayMetrics.density).toInt())
                }
                rowLayout.addView(TextView(this).apply {
                    text = dayName
                    setTextColor(Color.parseColor("#1A1A1A"))
                    textSize = 13f
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                })
                rowLayout.addView(TextView(this).apply {
                    text = value
                    setTextColor(Color.parseColor("#5B5A55"))
                    textSize = 13f
                })
                card.addView(rowLayout)
            }
        }
        container.addView(card)
    }

    // ---- helpers ----

    private fun openBooking(serviceName: String) {
        val intent = Intent(this, BookingActivity::class.java)
        intent.putExtra("BARBERSHOP_ID", shopId)
        intent.putExtra("SHOP_NAME", shopName)
        intent.putExtra("BARBER_NAME", shopName)
        intent.putExtra("SERVICE_NAME", serviceName)
        startActivity(intent)
    }

    private fun setupFavorite() {
        val prefs = getSharedPreferences("TrimlyPrefs", MODE_PRIVATE)
        val favIcon = findViewById<CardView>(R.id.favBtn).getChildAt(0) as AppCompatImageView

        fun favSet(): MutableSet<String> =
            HashSet(prefs.getStringSet("FAV_SHOPS", emptySet()) ?: emptySet())

        var isFav = favSet().contains(shopId)
        updateFavIcon(favIcon, isFav)

        findViewById<CardView>(R.id.favBtn).setOnClickListener {
            if (shopId.isEmpty()) return@setOnClickListener
            isFav = !isFav
            val set = favSet()
            if (isFav) set.add(shopId) else set.remove(shopId)
            prefs.edit().putStringSet("FAV_SHOPS", set).apply()
            updateFavIcon(favIcon, isFav)
            Toast.makeText(this, if (isFav) "Added to favorites ❤️" else "Removed from favorites", Toast.LENGTH_SHORT).show()
        }
    }

    private fun updateFavIcon(icon: AppCompatImageView, isFav: Boolean) {
        icon.setColorFilter(Color.parseColor(if (isFav) "#E0654C" else "#FFFFFF"))
    }

    private fun emptyText(text: String) = TextView(this).apply {
        this.text = text
        setTextColor(Color.parseColor("#5B5A55"))
        textSize = 13f
        setPadding(0, (8 * resources.displayMetrics.density).toInt(), 0, 0)
    }

    private fun label(text: String) = TextView(this).apply {
        this.text = text.uppercase()
        setTextColor(Color.parseColor("#5B5A55"))
        textSize = 10f
        letterSpacing = 0.08f
        setPadding(0, 0, 0, (4 * resources.displayMetrics.density).toInt())
    }

    private fun body(text: String) = TextView(this).apply {
        this.text = text
        setTextColor(Color.parseColor("#1A1A1A"))
        textSize = 14f
    }

    private fun parseTime(value: String, vararg fmts: SimpleDateFormat): String {
        // last fmt is the output formatter
        val out = fmts.last()
        for (i in 0 until fmts.size - 1) {
            try {
                return out.format(fmts[i].parse(value)!!)
            } catch (_: Exception) { }
        }
        return value
    }

    private fun formatDate(iso: String?, out: SimpleDateFormat): String {
        if (iso == null) return ""
        var s = iso.trim()
        s = if (s.endsWith("Z")) s.dropLast(1) + "+0000"
        else Regex("([+-]\\d{2}):(\\d{2})$").replace(s) { "${it.groupValues[1]}${it.groupValues[2]}" }
        s = Regex("\\.\\d+").replace(s, "")
        for (p in listOf("yyyy-MM-dd'T'HH:mm:ssZ", "yyyy-MM-dd'T'HH:mm:ss")) {
            try {
                val parser = SimpleDateFormat(p, Locale.US)
                return out.format(parser.parse(s)!!)
            } catch (_: Exception) { }
        }
        return ""
    }
}
