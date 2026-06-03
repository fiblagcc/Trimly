package com.example.trimly

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.lifecycle.lifecycleScope
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch

class FavoritesActivity : AppCompatActivity() {

    private val emojis = listOf("✂️", "💈", "🪒", "👑", "⭐")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_favorites)

        window.statusBarColor = Color.parseColor("#F1EFE8")

        findViewById<CardView>(R.id.backBtn).setOnClickListener { finish() }

        // Hide the old hardcoded demo cards; we render real favorites dynamically.
        listOf(R.id.favCard1, R.id.favCard2, R.id.favCard3).forEach {
            findViewById<View>(it).visibility = View.GONE
        }

        loadFavorites()
    }

    override fun onResume() {
        super.onResume()
        // Re-read in case the user just toggled a favorite on the shop screen.
        loadFavorites()
    }

    private fun loadFavorites() {
        val container = findViewById<LinearLayout>(R.id.favContainer)
        val emptyView = findViewById<LinearLayout>(R.id.emptyView)

        // Clear any previously rendered favorite cards (keep emptyView + hidden demo cards).
        val keepIds = setOf(R.id.emptyView, R.id.favCard1, R.id.favCard2, R.id.favCard3)
        for (i in container.childCount - 1 downTo 0) {
            val child = container.getChildAt(i)
            if (child.id !in keepIds) container.removeViewAt(i)
        }

        val prefs = getSharedPreferences("TrimlyPrefs", MODE_PRIVATE)
        val favIds = prefs.getStringSet("FAV_SHOPS", emptySet())?.toList() ?: emptyList()

        if (favIds.isEmpty()) {
            emptyView.visibility = View.VISIBLE
            return
        }
        emptyView.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val shops = SupabaseClient.client.from("barbershops")
                    .select { filter { isIn("id", favIds) } }
                    .decodeList<Shop>()

                runOnUiThread {
                    if (shops.isEmpty()) {
                        emptyView.visibility = View.VISIBLE
                        return@runOnUiThread
                    }
                    shops.forEachIndexed { i, shop ->
                        val card = layoutInflater.inflate(R.layout.item_shop, container, false)
                        card.findViewById<TextView>(R.id.shopEmoji).text = emojis[i % emojis.size]
                        card.findViewById<TextView>(R.id.shopName).text = shop.shop_name
                        card.findViewById<TextView>(R.id.shopAddress).text = shop.address ?: ""
                        card.findViewById<TextView>(R.id.shopRating).text = "❤ Saved"
                        card.findViewById<TextView>(R.id.shopStatus).visibility = View.GONE
                        val open = View.OnClickListener {
                            startActivity(
                                Intent(this@FavoritesActivity, BarbershopActivity::class.java)
                                    .putExtra("SHOP_ID", shop.id)
                            )
                        }
                        card.findViewById<LinearLayout>(R.id.shopCard).setOnClickListener(open)
                        card.findViewById<com.google.android.material.button.MaterialButton>(R.id.bookBtn)
                            .setOnClickListener(open)
                        container.addView(card)
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    android.widget.Toast.makeText(
                        this@FavoritesActivity,
                        "Couldn't load favorites: ${e.message}",
                        android.widget.Toast.LENGTH_LONG
                    ).show()
                    emptyView.visibility = View.VISIBLE
                }
            }
        }
    }
}
