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
        console.log("[v0] ⚠️ ATENÇÃO: Se o role for 'service_role', você está usando a chave ERRADA!")
        console.log("[v0] ⚠️ O frontend precisa da 'anon' key, NÃO a 'service_role' key!")
      } catch (e) {
        console.log("[v0] Could not decode key payload")
      }
    }
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }

  console.log("[v0] Supabase client criado com sucesso!")
  console.log("[v0] =================================")

  return createBrowserClient(supabaseUrl, supabaseKey)
}
