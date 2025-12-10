import { API_URL, API_INTERNAL_URL, WS_URL } from "./env"

export const config = {
  // API Configuration
  api: {
    // HTTP API base URL
    baseURL: typeof window !== "undefined" ? API_URL : API_INTERNAL_URL,

    // WebSocket URL
    wsURL: WS_URL,
  },

  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
} as const

if (typeof window !== "undefined") {
  console.log("[v0] ============= CONFIG LOADED =============")
  console.log("[v0] API_BASE_URL =", config.api.baseURL)
  console.log("[v0] WS_BASE_URL =", config.api.wsURL)
  console.log("[v0] SUPABASE_URL =", config.supabase.url)
  console.log("[v0] ========================================")

  const isProduction = !window.location.hostname.includes("localhost")
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
