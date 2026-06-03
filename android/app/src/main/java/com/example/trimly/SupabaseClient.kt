package com.example.trimly

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.auth.Auth

object SupabaseClient {
    val client = createSupabaseClient(
        supabaseUrl = "https://madsedhycdiattoaypyl.supabase.co",
        supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZHNlZGh5Y2RpYXR0b2F5cHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjEyMzgsImV4cCI6MjA5NTgzNzIzOH0.zQjy5hGYqmk39ZtzNgjzV3LTwzyndkC6AXQddiD0az0"
    ) {
        install(Postgrest)
        install(Auth)
    }
}