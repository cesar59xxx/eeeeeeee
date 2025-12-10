export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://eeeeeeee-production.up.railway.app"
export const API_INTERNAL_URL = process.env.API_INTERNAL_URL || API_URL
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://eeeeeeee-production.up.railway.app"

// Validation
if (typeof window !== "undefined") {
  const isProduction = !window.location.hostname.includes("localhost")
  const usingLocalhost = API_URL.includes("localhost") || WS_URL.includes("localhost")

  console.log("[v0] ============= ENVIRONMENT CONFIG =============")
  console.log("[v0] API_URL:", API_URL)
  console.log("[v0] WS_URL:", WS_URL)
  console.log("[v0] Is Production:", isProduction)
  console.log("[v0] Using Localhost:", usingLocalhost)
  console.log("[v0] ===============================================")

  if (isProduction && usingLocalhost) {
    console.error(
      "❌ CRITICAL ERROR: Running in production but using localhost URLs!\n" +
        "Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL environment variables in Vercel.",
    )
  }
}
