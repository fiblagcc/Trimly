package com.example.trimly

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.AppCompatImageView
import androidx.cardview.widget.CardView
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Serializable
data class Shop(
    val id: String,
    val shop_name: String,
    val address: String? = null,
    val bio: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val is_active: Boolean = true,
    val created_at: String? = null
)

@Serializable
data class ShopRating(
    val barbershop_id: String,
    val avg_rating: Double? = null,
    val review_count: Int = 0
)

class HomeActivity : AppCompatActivity() {

    private var allShops = listOf<Shop>()
    private var ratings = mapOf<String, ShopRating>()

    private var currentCategory = "Nearby"
    private var currentQuery = ""
    private var activeNavId = R.id.navHome

    private val emojis = listOf("✂️", "💈", "🪒", "👑", "⭐")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        window.statusBarColor = Color.parseColor("#F1EFE8")

        val prefs = getSharedPreferences("TrimlyPrefs", MODE_PRIVATE)
        val userName = prefs.getString("USER_NAME", "there") ?: "there"
        findViewById<TextView>(R.id.greetingText).text = "Hey, $userName 👋"
        findViewById<TextView>(R.id.headerDate).text =
            SimpleDateFormat("EEEE, MMM d", Locale.US).format(Date())

        setupSearch()
        setupCategories()
        setupNavbar()
        loadShops()
    }

    override fun onResume() {
        super.onResume()
        setNavActive(activeNavId)
        refreshUnread()
    }

    private fun refreshUnread() {
        lifecycleScope.launch {
            try {
                val uid = SupabaseClient.client.auth.currentSessionOrNull()?.user?.id ?: return@launch
                val unread = SupabaseClient.client.from("notifications")
                    .select { filter { eq("user_id", uid); eq("is_read", false) } }
                    .decodeList<Notification>()
                    .size
                runOnUiThread {
                    findViewById<View>(R.id.notifDot).visibility =
                        if (unread > 0) View.VISIBLE else View.GONE
                }
            } catch (_: Exception) { }
        }
    }

    private fun loadShops() {
        lifecycleScope.launch {
            try {
                val shops = SupabaseClient.client
                    .from("barbershops")
                    .select {
                        filter { eq("is_active", true) }
                        order("created_at", Order.DESCENDING)
                    }
                    .decodeList<Shop>()

                val ratingList = try {
                    SupabaseClient.client.from("barbershop_ratings").select().decodeList<ShopRating>()
                } catch (e: Exception) {
                    emptyList()
                }

                allShops = shops
                ratings = ratingList.associateBy { it.barbershop_id }

                runOnUiThread { renderShops() }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@HomeActivity, "Couldn't load shops: ${e.message}", Toast.LENGTH_LONG).show()
                    renderShops()
                }
            }
        }
    }

    private fun filtered(): List<Shop> {
        var list = allShops.filter { shop ->
            currentQuery.isEmpty() ||
                shop.shop_name.contains(currentQuery, ignoreCase = true) ||
                (shop.address?.contains(currentQuery, ignoreCase = true) == true)
        }
        list = when (currentCategory) {
            "Top Rated" -> list.filter { (ratings[it.id]?.avg_rating ?: 0.0) >= 4.5 }
                .sortedByDescending { ratings[it.id]?.avg_rating ?: 0.0 }
            "New" -> list.sortedByDescending { it.created_at ?: "" }
            else -> list
        }
        return list
    }

    private fun ratingLabel(shop: Shop): String {
        val r = ratings[shop.id]
        return if (r?.avg_rating != null) "⭐ ${r.avg_rating} (${r.review_count})" else "⭐ New"
    }

    private fun openShop(shop: Shop) {
        startActivity(
            Intent(this, BarbershopActivity::class.java).putExtra("SHOP_ID", shop.id)
        )
    }

    private fun renderShops() {
        val container = findViewById<LinearLayout>(R.id.shopsContainer)
        val noResults = findViewById<TextView>(R.id.noResultsText)
        container.removeAllViews()

        renderFeatured()

        val list = filtered()
        if (list.isEmpty()) {
            noResults.visibility = View.VISIBLE
            return
        }
        noResults.visibility = View.GONE

        val m = (6 * resources.displayMetrics.density).toInt()
        var i = 0
        while (i < list.size) {
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
            }
            var col = 0
            while (col < 2) {
                if (i < list.size) {
                    val shop = list[i]
                    val idx = i
                    val card = layoutInflater.inflate(R.layout.item_shop, row, false)
                    bindCard(card, shop, idx)
                    card.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                        .apply { setMargins(m, m, m, m) }
                    row.addView(card)
                    i++
                } else {
                    val spacer = View(this)
                    spacer.layoutParams = LinearLayout.LayoutParams(0, 1, 1f).apply { setMargins(m, m, m, m) }
                    row.addView(spacer)
                }
                col++
            }
            container.addView(row)
        }
    }

    private fun bindCard(card: View, shop: Shop, index: Int) {
        card.findViewById<TextView>(R.id.shopEmoji).text = emojis[index % emojis.size]
        card.findViewById<TextView>(R.id.shopName).text = shop.shop_name
        card.findViewById<TextView>(R.id.shopAddress).text = shop.address ?: "Barbershop"
        card.findViewById<TextView>(R.id.shopRating).text = ratingLabel(shop)
        card.findViewById<TextView>(R.id.shopStatus).text = "Open"
        card.findViewById<LinearLayout>(R.id.shopCard).setOnClickListener { openShop(shop) }
        card.findViewById<MaterialButton>(R.id.bookBtn).setOnClickListener { openShop(shop) }
    }

    private fun renderFeatured() {
        val container = findViewById<LinearLayout>(R.id.featuredContainer)
        val label = findViewById<TextView>(R.id.featuredLabel)
        container.removeAllViews()

        // Featured = the highest-rated active shop, else the newest.
        val featured = allShops.maxByOrNull { ratings[it.id]?.avg_rating ?: 0.0 } ?: allShops.firstOrNull()
        if (featured == null) {
            label.visibility = View.GONE
            return
        }
        label.visibility = View.VISIBLE

        val card = layoutInflater.inflate(R.layout.item_featured, container, false)
        card.findViewById<TextView>(R.id.featuredEmoji).text = emojis[0]
        card.findViewById<TextView>(R.id.featuredName).text = featured.shop_name
        card.findViewById<TextView>(R.id.featuredSub).text = featured.address ?: "Top rated near you"
        card.findViewById<TextView>(R.id.featuredRating).text = ratingLabel(featured)
        card.findViewById<MaterialButton>(R.id.featuredBook).setOnClickListener { openShop(featured) }
        card.findViewById<LinearLayout>(R.id.featuredCard).setOnClickListener { openShop(featured) }
        container.addView(card)
    }

    private fun setupSearch() {
        findViewById<EditText>(R.id.searchInput).addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {}
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                currentQuery = s.toString()
                renderShops()
            }
        })
    }

    private fun setupCategories() {
        val catNearby = findViewById<TextView>(R.id.catNearby)
        val catTopRated = findViewById<TextView>(R.id.catTopRated)
        val catOpenNow = findViewById<TextView>(R.id.catOpenNow)
        val catNew = findViewById<TextView>(R.id.catNew)

        val categories = mapOf(
            catNearby to "Nearby",
            catTopRated to "Top Rated",
            catOpenNow to "Open Now",
            catNew to "New"
        )

        categories.forEach { (view, category) ->
            view.setOnClickListener {
                currentCategory = category
                updateCategoryUI(categories)
                renderShops()
            }
        }
    }

    private fun updateCategoryUI(categories: Map<TextView, String>) {
        categories.forEach { (view, category) ->
            if (category == currentCategory) {
                view.setBackgroundResource(R.drawable.bg_cat_active)
                view.setTextColor(Color.WHITE)
            } else {
                view.setBackgroundResource(R.drawable.bg_cat_inactive)
                view.setTextColor(Color.parseColor("#5B5A55"))
            }
        }
    }

    private fun setupNavbar() {
        findViewById<LinearLayout>(R.id.navHome).setOnClickListener {
            activeNavId = R.id.navHome
            setNavActive(R.id.navHome)
        }
        findViewById<LinearLayout>(R.id.navBookings).setOnClickListener {
            activeNavId = R.id.navBookings
            setNavActive(R.id.navBookings)
            startActivity(Intent(this, BookingsActivity::class.java))
        }
        findViewById<LinearLayout>(R.id.navFavorites).setOnClickListener {
            activeNavId = R.id.navFavorites
            setNavActive(R.id.navFavorites)
            startActivity(Intent(this, FavoritesActivity::class.java))
        }
        findViewById<LinearLayout>(R.id.navProfile).setOnClickListener {
            activeNavId = R.id.navProfile
            setNavActive(R.id.navProfile)
            startActivity(Intent(this, ProfileActivity::class.java))
        }
        findViewById<CardView>(R.id.notifBtn).setOnClickListener {
            startActivity(Intent(this, NotificationsActivity::class.java))
        }
    }

    private fun setNavActive(activeId: Int) {
        val navIds = listOf(R.id.navHome, R.id.navBookings, R.id.navFavorites, R.id.navProfile)
        navIds.forEach { id ->
            val nav = findViewById<LinearLayout>(id)
            val icon = nav.getChildAt(0) as AppCompatImageView
            val label = nav.getChildAt(1) as TextView
            if (id == activeId) {
                icon.setColorFilter(Color.parseColor("#1D9E75"))
                label.setTextColor(Color.parseColor("#1D9E75"))
            } else {
                icon.setColorFilter(Color.parseColor("#9A988F"))
                label.setTextColor(Color.parseColor("#9A988F"))
            }
        }
    }
}
