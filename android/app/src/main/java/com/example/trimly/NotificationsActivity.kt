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
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

@Serializable
data class Notification(
    val id: String,
    val type: String? = null,
    val title: String,
    val body: String? = null,
    val is_read: Boolean = false,
    val created_at: String? = null
)

class NotificationsActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_notifications)

        window.statusBarColor = Color.parseColor("#F1EFE8")

        findViewById<CardView>(R.id.backBtn).setOnClickListener { finish() }

        load()
    }

    private fun load() {
        val container = findViewById<LinearLayout>(R.id.notifContainer)
        val emptyView = findViewById<LinearLayout>(R.id.emptyView)

        lifecycleScope.launch {
            try {
                val uid = SupabaseClient.client.auth.currentSessionOrNull()?.user?.id
                if (uid == null) {
                    runOnUiThread { emptyView.visibility = View.VISIBLE }
                    return@launch
                }

                val list = SupabaseClient.client.from("notifications")
                    .select {
                        filter { eq("user_id", uid) }
                        order("created_at", Order.DESCENDING)
                    }
                    .decodeList<Notification>()

                runOnUiThread { render(container, emptyView, list) }

                // Mark everything read so the home bell dot clears.
                try {
                    SupabaseClient.client.from("notifications").update(
                        buildJsonObject { put("is_read", true) }
                    ) {
                        filter { eq("user_id", uid); eq("is_read", false) }
                    }
                } catch (_: Exception) { }
            } catch (e: Exception) {
                runOnUiThread {
                    android.widget.Toast.makeText(
                        this@NotificationsActivity,
                        "Couldn't load notifications: ${e.message}",
                        android.widget.Toast.LENGTH_LONG
                    ).show()
                    emptyView.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun render(container: LinearLayout, emptyView: LinearLayout, list: List<Notification>) {
        if (list.isEmpty()) {
            emptyView.visibility = View.VISIBLE
            return
        }
        emptyView.visibility = View.GONE
        val out = SimpleDateFormat("MMM d · h:mm a", Locale.US)
        list.forEach { n ->
            val row = layoutInflater.inflate(R.layout.item_notification, container, false)
            row.findViewById<View>(R.id.notifUnreadDot).visibility =
                if (n.is_read) View.INVISIBLE else View.VISIBLE
            row.findViewById<TextView>(R.id.notifTitle).text = n.title
            val body = row.findViewById<TextView>(R.id.notifBody)
            if (n.body.isNullOrBlank()) body.visibility = View.GONE else body.text = n.body
            row.findViewById<TextView>(R.id.notifTime).text = formatDate(n.created_at, out)
            container.addView(row)
        }
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
                if (!p.endsWith("Z")) parser.timeZone = TimeZone.getTimeZone("UTC")
                return out.format(parser.parse(s)!!)
            } catch (_: Exception) { }
        }
        return ""
    }
}
