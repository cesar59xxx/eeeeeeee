export const config = {
  // API Configuration
  api: {
    // HTTP API base URL
    baseURL:
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
        : process.env.API_INTERNAL_URL || "http://localhost:3001",

    // WebSocket URL
    wsURL:
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000"
        : process.env.API_INTERNAL_URL || "http://localhost:3001",
  },

  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldieqcofmincppqzownw.supabase.co",
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaWVxY29mbWluY3BwcXpvd253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNTU2ODIsImV4cCI6MjA3OTgzMTY4Mn0.lF1zMajkO46ilUeuKU14eDw-CM4TakEhpZbgBef5_Hg",
  },
} as const

if (typeof window !== "undefined") {
  console.log("[v0] ============= CONFIG LOADED =============")
  console.log("[v0] API_BASE_URL =", config.api.baseURL)
  console.log("[v0] WS_BASE_URL =", config.api.wsURL)
  console.log("[v0] SUPABASE_URL =", config.supabase.url)
  console.log("[v0] ========================================")

  // Check if in production but using localhost
  const isProduction = window.location.hostname !== "localhost"
  const usingLocalhost = config.api.baseURL.includes("localhost") || config.api.wsURL.includes("localhost")

  if (isProduction && usingLocalhost) {
    console.error(
      "❌ ERROR: Running in production but using localhost URLs! Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL environment variables.",
    )
  } else if (isProduction) {
    console.log("✅ Production mode: Using Railway backend")
  } else {
    console.log("🔧 Development mode: Using localhost backend")
  }
}
