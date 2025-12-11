import { createBrowserClient } from "@supabase/ssr"
import { config } from "../config"

export function createClient() {
  console.log("[v0] =================================")
  console.log("[v0] Creating Supabase Client")
  console.log("[v0] =================================")

  const supabaseUrl = config.supabase.url
  const supabaseKey = config.supabase.anonKey

  console.log("[v0] URL exists:", !!supabaseUrl)
  console.log("[v0] Key exists:", !!supabaseKey)

  if (supabaseUrl) {
    console.log("[v0] URL value:", supabaseUrl.substring(0, 40) + "...")
  }

  if (supabaseKey) {
    console.log("[v0] Key starts with:", supabaseKey.substring(0, 20) + "...")
    console.log("[v0] Key length:", supabaseKey.length)

    const keyPayload = supabaseKey.split(".")[1]
    if (keyPayload) {
      try {
        const decoded = JSON.parse(atob(keyPayload))
        console.log("[v0] Key role:", decoded.role)

        if (decoded.role === "service_role") {
          console.error("[v0] ❌ ERROR: Using service_role key in frontend!")
          console.error("[v0] ❌ SECURITY RISK: You must use the ANON key!")
          console.error("[v0] ❌ Fix: Use NEXT_PUBLIC_SUPABASE_ANON_KEY instead")
          throw new Error("Security error: service_role key cannot be used in frontend")
        }

        if (decoded.role === "anon") {
          console.log("[v0] ✅ Correct: Using anon key")
        }
      } catch (e: any) {
        if (e.message.includes("Security error")) {
          throw e
        }
        console.log("[v0] Could not decode key payload")
      }
    }
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }

  console.log("[v0] Supabase client created successfully!")
  console.log("[v0] =================================")

  return createBrowserClient(supabaseUrl, supabaseKey)
}
