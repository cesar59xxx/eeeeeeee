export const config = {
  // API Configuration
  api: {
    baseURL:
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_API_URL || "https://eeeeeeee-production.up.railway.app"
        : process.env.API_INTERNAL_URL || "https://eeeeeeee-production.up.railway.app",
    wsURL:
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_WS_URL || "wss://eeeeeeee-production.up.railway.app"
        : process.env.API_INTERNAL_URL || "https://eeeeeeee-production.up.railway.app",
  },

  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldieqcofmincppqzownw.supabase.co",
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaWVxY29mbWluY3BwcXpvd253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNTU2ODIsImV4cCI6MjA3OTgzMTY4Mn0.lF1zMajkO46ilUeuKU14eDw-CM4TakEhpZbgBef5_Hg",
  },
} as const

// Validation
if (typeof window !== "undefined") {
  if (config.api.baseURL.includes("localhost") || config.api.wsURL.includes("localhost")) {
    console.warn(
      "⚠️ WARNING: Using localhost URLs in browser. Make sure NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL are set in production.",
    )
  }

  console.log("[CONFIG] API Base URL:", config.api.baseURL)
  console.log("[CONFIG] WebSocket URL:", config.api.wsURL)
  console.log("[CONFIG] Supabase URL:", config.supabase.url)
}
