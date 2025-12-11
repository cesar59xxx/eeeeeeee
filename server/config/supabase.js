import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log("[v0] Supabase Config Check:")
console.log("[v0] - URL:", supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "NOT SET")
console.log("[v0] - Service Key:", supabaseServiceKey ? "SET (" + supabaseServiceKey.length + " chars)" : "NOT SET")

let supabase
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("⚠️ WARNING: Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas")
  console.error("⚠️ O servidor irá iniciar, mas funcionalidades que dependem do Supabase não funcionarão")
  console.error("⚠️ Configure estas variáveis no Railway:")
  console.error("   - NEXT_PUBLIC_SUPABASE_URL")
  console.error("   - SUPABASE_SERVICE_ROLE_KEY")

  // Create a mock client that throws errors when used
  supabase = {
    from: () => {
      throw new Error("Supabase não configurado. Configure as variáveis de ambiente.")
    },
    auth: {
      signIn: () => {
        throw new Error("Supabase não configurado. Configure as variáveis de ambiente.")
      },
    },
  }
} else {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log("✅ Supabase client configurado com sucesso")
}

export { supabase }
