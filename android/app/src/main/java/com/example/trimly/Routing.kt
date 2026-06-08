package com.example.trimly

import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from

/**
 * Where to send the signed-in user based on their role:
 * barbers manage their shop, everyone else gets the client home.
 */
suspend fun destinationForCurrentUser(): Class<*> {
    val uid = SupabaseClient.client.auth.currentSessionOrNull()?.user?.id
        ?: return MainActivity::class.java
    val role = try {
        SupabaseClient.client.from("profiles")
            .select { filter { eq("id", uid) } }
            .decodeSingleOrNull<Profile>()
            ?.role
    } catch (e: Exception) { null }
    return if (role == "barber") BarberDashboardActivity::class.java else HomeActivity::class.java
}
