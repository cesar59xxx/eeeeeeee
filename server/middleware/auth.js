import { supabase } from "../config/supabase.js"

/**
 * Middleware para autenticar usuário via JWT token do Supabase
 * Extrai o user_id e tenant_id do token e anexa ao req
 */
export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[AUTH] No authorization header found")
      req.user = null
      return next()
    }

    const token = authHeader.substring(7)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.log("[AUTH] Invalid token:", authError?.message)
      req.user = null
      return next()
    }

    console.log("[AUTH] ✅ Authenticated user:", user.email, "ID:", user.id)

    const { data: userData } = await supabase.from("users").select("tenant_id, role").eq("id", user.id).single()

    req.user = {
      id: user.id,
      email: user.email,
      tenant_id: userData?.tenant_id || null,
      role: userData?.role || "user",
    }

    next()
  } catch (error) {
    console.error("[AUTH] Error:", error)
    req.user = null
    next()
  }
}

/**
 * Middleware para exigir autenticação
 */
export function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    })
  }
  next()
}
