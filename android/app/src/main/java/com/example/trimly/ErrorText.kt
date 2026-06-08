package com.example.trimly

fun friendlyError(e: Throwable?, fallback: String = "Something went wrong. Please try again."): String =
    friendlyErrorFromMessage(e?.message, fallback)

fun friendlyErrorFromMessage(
    message: String?,
    fallback: String = "Something went wrong. Please try again."
): String {
    val m = message ?: return fallback
    val low = m.lowercase()
    return when {
        low.contains("http request") || low.contains("resolve host") ||
            low.contains("failed to connect") || low.contains("timeout") ||
            low.contains("timed out") || low.contains("connection") ||
            low.contains("unreachable") || low.contains("network") ->
            "Network error. Check your internet connection and try again."
        low.contains("already registered") || low.contains("already been registered") ||
            low.contains("user already") ->
            "That email is already registered. Try logging in."
        low.contains("invalid login") || low.contains("invalid credentials") ->
            "Invalid email or password."
        else -> m.take(140)
    }
}
