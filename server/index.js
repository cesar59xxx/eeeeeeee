import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"
import { whatsappManager } from "./services/whatsapp-manager.service.js"
import { supabase } from "./config/supabase.js"

dotenv.config()

console.log("🚀 WhatsApp CRM Backend iniciando...")
console.log("📦 Node.js:", process.version)
console.log("🌍 Ambiente:", process.env.NODE_ENV || "development")

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  },
})

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
)
app.use(compression())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
})
app.use("/api/", limiter)

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

const mockSessions = []

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  })
})

app.get("/api/auth/me", (req, res) => {
  console.log("[v0] GET /api/auth/me")
  res.json({
    user: {
      id: "demo-user",
      email: "cesar.mediotec@gmail.com",
      name: "Demo User",
      role: "admin",
    },
    message: "Auth funcionando - usuário demo",
  })
})

app.post("/api/auth/login", (req, res) => {
  console.log("[v0] POST /api/auth/login:", req.body)
  const { email, password } = req.body

  res.json({
    success: true,
    user: {
      id: "demo-user",
      email: email || "demo@example.com",
      name: "Demo User",
      role: "admin",
    },
    token: "demo-token-" + Date.now(),
    message: "Login funcionando - auth será implementado em breve",
  })
})

app.post("/api/auth/register", (req, res) => {
  console.log("[v0] POST /api/auth/register:", req.body)
  const { email, password, name } = req.body

  res.status(201).json({
    success: true,
    user: {
      id: "demo-user-" + Date.now(),
      email,
      name,
      role: "user",
    },
    token: "demo-token-" + Date.now(),
    message: "Registro funcionando - auth será implementado em breve",
  })
})

app.post("/api/auth/logout", (req, res) => {
  console.log("[v0] POST /api/auth/logout")
  res.json({
    success: true,
    message: "Logout realizado com sucesso",
  })
})

app.post("/api/auth/refresh", (req, res) => {
  console.log("[v0] POST /api/auth/refresh")
  res.json({
    success: true,
    token: "demo-token-refreshed-" + Date.now(),
    message: "Token refresh funcionando",
  })
})

app.get("/", (req, res) => {
  res.json({
    message: "WhatsApp CRM Backend API",
    status: "running",
    version: "2.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/auth/*",
      sessions: "/api/whatsapp/sessions",
      qr: "/api/whatsapp/sessions/:sessionId/qr",
      disconnect: "/api/whatsapp/sessions/:sessionId/disconnect",
      connect: "/api/whatsapp/sessions/:sessionId/connect",
      sendMessage: "/api/whatsapp/send",
      debugWhatsApp: "/api/debug/whatsapp",
      testSupabase: "/api/test/supabase",
      fetchMessages: "/api/messages/:sessionId",
      sendMessageEndpoint: "/api/messages/send",
      contacts: "/api/contacts",
      sessionStatus: "/api/whatsapp/sessions/:id/status",
      sessionContacts: "/api/whatsapp/sessions/:sessionId/contacts",
      contactMessages: "/api/whatsapp/:sessionId/messages/:contactId",
    },
  })
})

app.get("/api/test/supabase", async (req, res) => {
  try {
    console.log("[v0] ========== TESTING SUPABASE ==========")
    console.log("[v0] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("[v0] Has Service Role Key:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log("[v0] Key length:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length)

    // Test simple query
    const { data, error, count } = await supabase.from("whatsapp_sessions").select("*", { count: "exact" })

    console.log("[v0] Query result:")
    console.log("[v0] - Error:", JSON.stringify(error, null, 2))
    console.log("[v0] - Data:", JSON.stringify(data, null, 2))
    console.log("[v0] - Count:", count)
    console.log("[v0] ==========================================")

    res.json({
      success: !error,
      error: error,
      data: data,
      count: count,
      config: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + "...",
      },
    })
  } catch (error) {
    console.error("[v0] Test error:", error)
    res.status(500).json({ error: error.message, stack: error.stack })
  }
})

app.get("/api/contacts", async (req, res) => {
  try {
    const { sessionId, limit = 100 } = req.query

    console.log("[v0] GET /api/contacts - sessionId:", sessionId, "limit:", limit)

    const query = supabase
      .from("contacts")
      .select("*")
      .order("last_interaction", { ascending: false })
      .limit(Number(limit))

    if (sessionId) {
      // Filter by session_id if provided
      const { data: messages } = await supabase
        .from("messages")
        .select("from_number, to_number")
        .eq("session_id", sessionId)

      const uniqueNumbers = new Set()
      messages?.forEach((msg) => {
        uniqueNumbers.add(msg.from_number)
        uniqueNumbers.add(msg.to_number)
      })

      query.in("phone_number", Array.from(uniqueNumbers))
    }

    const { data: contacts, error } = await query

    if (error) throw error

    res.json({
      success: true,
      data: contacts || [],
      total: contacts?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Error fetching contacts:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

const sessionRequestCache = new Map()

app.get("/api/whatsapp/sessions", async (req, res) => {
  try {
    const cacheKey = "sessions_list"
    const now = Date.now()

    // Check cache - 1 second cooldown
    if (sessionRequestCache.has(cacheKey)) {
      const lastRequest = sessionRequestCache.get(cacheKey)
      if (now - lastRequest < 1000) {
        return res.status(429).json({
          error: true,
          message: "Too many requests. Please wait.",
          details: "Rate limit: 1 request per second",
        })
      }
    }

    sessionRequestCache.set(cacheKey, now)

    const { tenantId } = req.query

    let query = supabase.from("whatsapp_sessions").select("*")

    if (tenantId) {
      query = query.eq("tenant_id", tenantId)
    }

    const { data: sessions, error } = await query

    if (error) {
      return res.status(500).json({
        error: true,
        message: "Failed to fetch sessions",
      })
    }

    const sessionsWithStatus = sessions.map((session) => ({
      id: session.id,
      name: session.phone_number || "Unnamed",
      status: session.status,
      phone: session.phone_number,
      qrCode: session.qr_code,
      isConnected: whatsappManager.isSessionActive(session.id),
    }))

    res.json({
      success: true,
      sessions: sessionsWithStatus,
    })
  } catch (error) {
    console.error("[v0] Error:", error)
    res.status(500).json({
      error: true,
      message: "Failed to fetch sessions",
    })
  }
})

app.post("/api/whatsapp/sessions", async (req, res) => {
  try {
    console.log("[v0] ========== CREATE SESSION ==========")
    console.log("[v0] Request body:", JSON.stringify(req.body))

    const { name } = req.body

    if (!name || typeof name !== "string" || name.trim() === "") {
      console.log("[v0] ERROR: Invalid or missing name")
      return res.status(400).json({
        success: false,
        error: "Name is required and must be a non-empty string",
      })
    }

    const trimmedName = name.trim()
    console.log("[v0] Creating session with name:", trimmedName)

    console.log("[v0] Step 1: Looking for default tenant...")
    const { data: existingTenants, error: tenantQueryError } = await supabase
      .from("tenants")
      .select("id, name, email")
      .eq("email", "default@system.local")
      .limit(1)

    if (tenantQueryError) {
      console.error("[v0] ERROR: Failed to query tenants:", tenantQueryError)
      return res.status(500).json({
        success: false,
        error: "Database error querying tenants",
      })
    }

    let tenantId

    if (existingTenants && existingTenants.length > 0) {
      tenantId = existingTenants[0].id
      console.log("[v0] ✅ Using existing tenant:", tenantId)
    } else {
      console.log("[v0] Creating new default tenant...")
      const { data: newTenant, error: tenantCreateError } = await supabase
        .from("tenants")
        .insert({
          name: "Default System",
          email: "default@system.local",
        })
        .select("id")
        .single()

      if (tenantCreateError || !newTenant) {
        console.error("[v0] ERROR: Failed to create tenant:", tenantCreateError)
        return res.status(500).json({
          success: false,
          error: "Failed to create tenant",
        })
      }

      tenantId = newTenant.id
      console.log("[v0] ✅ Created new tenant:", tenantId)
    }

    console.log("[v0] Step 2: Creating WhatsApp session in database...")
    const sessionInsertData = {
      tenant_id: tenantId,
      name: trimmedName,
      status: "qr",
      is_active: true,
    }

    console.log("[v0] Insert data:", JSON.stringify(sessionInsertData))

    const { data: createdSession, error: sessionCreateError } = await supabase
      .from("whatsapp_sessions")
      .insert(sessionInsertData)
      .select("id, tenant_id, name, status, is_active")
      .single()

    if (sessionCreateError || !createdSession) {
      console.error("[v0] ERROR: Failed to create session:", sessionCreateError)
      return res.status(500).json({
        success: false,
        error: "Failed to create WhatsApp session",
        details: sessionCreateError?.message,
      })
    }

    console.log("[v0] ✅ Session created in database")
    console.log("[v0] Session ID:", createdSession.id)
    console.log("[v0] Session name:", createdSession.name)

    const responseData = {
      success: true,
      session: {
        id: createdSession.id,
        name: createdSession.name,
        status: createdSession.status,
        tenant_id: createdSession.tenant_id,
        isConnected: false,
      },
      message: "Session created successfully. Call /start to initialize WhatsApp.",
    }

    console.log("[v0] ✅ Sending response:", JSON.stringify(responseData, null, 2))
    console.log("[v0] ========================================")

    return res.status(201).json(responseData)
  } catch (error) {
    console.error("[v0] ========== UNEXPECTED ERROR ==========")
    console.error("[v0] ERROR:", error.message)
    console.error("[v0] STACK:", error.stack)
    console.error("[v0] =======================================")

    return res.status(500).json({
      success: false,
      error: "Unexpected server error",
      details: error.message,
    })
  }
})

app.post("/api/whatsapp/sessions/:id/start", async (req, res) => {
  try {
    const { id } = req.params
    console.log("[v0] ========== START SESSION ==========")
    console.log("[v0] Session ID:", id)

    if (!id || id === "undefined" || id === "null" || id.trim() === "") {
      console.error("[v0] ERROR: Invalid or missing session ID")
      return res.status(400).json({
        success: false,
        error: "Valid session ID is required",
      })
    }

    const { data: sessions, error: fetchError } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("id", id)
      .limit(1)

    if (fetchError) {
      console.error("[v0] ERROR: Database error:", fetchError)
      return res.status(500).json({
        success: false,
        error: "Database error",
      })
    }

    if (!sessions || sessions.length === 0) {
      console.error("[v0] ERROR: Session not found:", id)
      return res.status(404).json({
        success: false,
        error: "Session not found",
      })
    }

    const session = sessions[0]
    console.log("[v0] ✅ Found session:", session.name || session.id)

    const { error: updateError } = await supabase
      .from("whatsapp_sessions")
      .update({ status: "initializing" })
      .eq("id", id)

    if (updateError) {
      console.error("[v0] ERROR: Failed to update session status:", updateError)
    }

    console.log("[v0] Initializing WhatsApp client asynchronously...")
    setImmediate(async () => {
      try {
        await whatsappManager.initializeSession(id)
        console.log("[v0] ✅ WhatsApp client initialized successfully")
      } catch (error) {
        console.error("[v0] ERROR initializing WhatsApp:", error)
        await supabase
          .from("whatsapp_sessions")
          .update({
            status: "error",
            error_message: error.message,
          })
          .eq("id", id)
      }
    })

    console.log("[v0] ✅ Session start initiated")
    console.log("[v0] ======================================")

    return res.status(200).json({
      success: true,
      message: "Session initialization started. QR code will be emitted via WebSocket.",
      sessionId: id,
    })
  } catch (error) {
    console.error("[v0] ========== ERROR ==========")
    console.error("[v0]", error)
    console.error("[v0] ==============================")

    return res.status(500).json({
      success: false,
      error: "Failed to start session",
      details: error.message,
    })
  }
})

app.post("/api/whatsapp/sessions/:sessionId/disconnect", async (req, res) => {
  try {
    const { sessionId } = req.params
    console.log("[v0] POST /api/whatsapp/sessions/:sessionId/disconnect:", sessionId)

    await whatsappManager.disconnectSession(sessionId)

    res.json({
      success: true,
      message: "Sessão desconectada com sucesso",
    })
  } catch (error) {
    console.error("Error disconnecting session:", error)
    res.status(500).json({ error: error.message })
  }
})

app.post("/api/whatsapp/sessions/:sessionId/connect", async (req, res) => {
  try {
    const { sessionId } = req.params
    console.log("[v0] POST /api/whatsapp/sessions/:sessionId/connect:", sessionId)

    await whatsappManager.initializeSession(sessionId)

    res.json({
      success: true,
      message: "Sessão iniciando - aguarde o QR code",
    })
  } catch (error) {
    console.error("Error connecting session:", error)
    res.status(500).json({ error: error.message })
  }
})

app.get("/api/whatsapp/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params
    console.log("[v0] GET /api/whatsapp/:sessionId/messages:", sessionId)

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("whatsapp_session_id", sessionId)
      .order("timestamp", { ascending: false })
      .limit(100)

    if (error) {
      return res.status(500).json({
        error: true,
        message: "Failed to fetch messages",
      })
    }

    res.json({
      success: true,
      messages,
    })
  } catch (error) {
    console.error("[v0] Error:", error)
    res.status(500).json({
      error: true,
      message: "Failed to fetch messages",
    })
  }
})

app.post("/api/whatsapp/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params
    const { to, body } = req.body

    if (!to || !body) {
      return res.status(400).json({
        error: true,
        message: "Missing required fields",
      })
    }

    const client = whatsappManager.getClient(sessionId)

    if (!client) {
      return res.status(400).json({
        error: true,
        message: "Session not active",
      })
    }

    const message = await client.sendMessage(to, body)

    const { data: session } = await supabase.from("whatsapp_sessions").select("tenant_id").eq("id", sessionId).single()

    const { data: savedMessage } = await supabase
      .from("messages")
      .insert([
        {
          tenant_id: session.tenant_id,
          whatsapp_session_id: sessionId,
          from_me: true,
          body,
          timestamp: new Date().toISOString(),
          status: "sent",
        },
      ])
      .select()
      .single()

    res.json({
      success: true,
      message: savedMessage,
    })
  } catch (error) {
    console.error("[v0] Error:", error)
    res.status(500).json({
      error: true,
      message: "Failed to send message",
    })
  }
})

app.get("/api/messages/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params
    console.log("[v0] GET /api/messages/:sessionId:", sessionId)

    const { data: session } = await supabase.from("whatsapp_sessions").select("id").eq("session_id", sessionId).single()

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" })
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("whatsapp_session_id", session.id)
      .order("timestamp", { ascending: true })

    if (error) {
      return res.status(500).json({
        error: true,
        message: "Failed to fetch messages",
      })
    }

    res.json({
      success: true,
      data: messages || [],
      total: messages?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Error in messages endpoint:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get("/api/whatsapp/sessions/:sessionId/contacts", async (req, res) => {
  try {
    const { sessionId } = req.params
    const limit = req.query.limit ? Number.parseInt(req.query.limit) : 50

    console.log("[v0] GET /api/whatsapp/sessions/:sessionId/contacts:", sessionId, "limit:", limit)

    // Get unique contacts from messages
    const { data: messages, error } = await supabase
      .from("messages")
      .select("from_number, to_number, body, timestamp, direction")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: false })

    if (error) throw error

    // Extract unique contacts
    const contactMap = new Map()

    messages?.forEach((msg) => {
      const contactNumber = msg.direction === "incoming" ? msg.from_number : msg.to_number

      if (!contactMap.has(contactNumber)) {
        contactMap.set(contactNumber, {
          whatsapp_id: contactNumber,
          name: contactNumber.replace(/\D/g, ""),
          phone_number: contactNumber,
          lastMessage: msg.body,
          lastMessageTime: msg.timestamp,
          unreadCount: 0,
        })
      }
    })

    const contacts = Array.from(contactMap.values()).slice(0, limit)

    res.json({
      success: true,
      contacts: contacts,
      data: contacts,
      total: contacts.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching contacts:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get("/api/whatsapp/:sessionId/messages/:contactId", async (req, res) => {
  try {
    const { sessionId, contactId } = req.params
    console.log("[v0] GET /api/whatsapp/:sessionId/messages/:contactId:", sessionId, contactId)

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .or(`from_number.eq.${contactId},to_number.eq.${contactId}`)
      .order("timestamp", { ascending: true })

    if (error) throw error

    res.json({
      success: true,
      messages: messages || [],
      data: messages || [],
      total: messages?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Error fetching messages for contact:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get("/api/whatsapp/sessions/:id/status", async (req, res) => {
  try {
    const { id } = req.params

    const { data: session } = await supabase.from("whatsapp_sessions").select("*").eq("id", id).single()

    if (!session) {
      return res.status(404).json({
        error: true,
        message: "Session not found",
      })
    }

    const isActive = whatsappManager.isSessionActive(id)

    res.json({
      ok: true,
      sessionId: id,
      status: isActive ? "connected" : session.status,
      phoneNumber: session.phone_number,
      qr: session.qr_code,
    })
  } catch (error) {
    console.error("[v0] Error:", error)
    res.status(500).json({
      error: true,
      message: "Failed to get session status",
    })
  }
})

app.delete("/api/whatsapp/sessions/:id", async (req, res) => {
  try {
    const { id } = req.params

    await whatsappManager.disconnectSession(id)

    const { error } = await supabase.from("whatsapp_sessions").delete().eq("id", id)

    if (error) {
      return res.status(500).json({
        error: true,
        message: "Failed to delete session",
      })
    }

    res.json({
      success: true,
      message: "Session deleted",
    })
  } catch (error) {
    console.error("[v0] Error:", error)
    res.status(500).json({
      error: true,
      message: "Failed to delete session",
    })
  }
})

app.get("/api/debug/whatsapp", async (req, res) => {
  try {
    const { data: sessions } = await supabase.from("whatsapp_sessions").select("*")

    const whatsappStatus = {
      isManagerLoaded: !!whatsappManager,
      managerType: typeof whatsappManager,
      activeSessions: whatsappManager?.clients ? Object.keys(whatsappManager.clients).length : 0,
      supabaseSessions: sessions?.length || 0,
      environmentVars: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        nodeVersion: process.version,
        platform: process.platform,
      },
    }

    res.json(whatsappStatus)
  } catch (error) {
    console.error("[v0] Debug endpoint error:", error)
    res.status(500).json({ error: error.message, stack: error.stack })
  }
})

io.on("connection", (socket) => {
  console.log(`[v0] 🔌 Client connected: ${socket.id}`)

  socket.on("join-session", (sessionId) => {
    console.log(`[v0] Client ${socket.id} joining session room: ${sessionId}`)
    socket.join(sessionId)
    socket.emit("joined-session", { sessionId })
  })

  socket.on("leave-session", (sessionId) => {
    console.log(`[v0] Client ${socket.id} leaving session room: ${sessionId}`)
    socket.leave(sessionId)
  })

  socket.on("disconnect", () => {
    console.log(`[v0] ⚡ Client disconnected: ${socket.id}`)
  })
})

app.use((err, req, res, next) => {
  console.error("❌ Erro:", err)
  res.status(500).json({
    error: err.message || "Erro interno do servidor",
  })
})

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint não encontrado",
    path: req.path,
  })
})

const PORT = Number.parseInt(process.env.PORT, 10) || 8080

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔═══════════════════════════════════╗
║   ✅ SERVIDOR ONLINE!             ║
╠═══════════════════════════════════╣
║ 🔗 Porta: ${PORT.toString().padEnd(23)}║
║ 🌐 Health: /health                ║
║ 📱 Frontend: ${(process.env.FRONTEND_URL || "não configurado").substring(0, 18).padEnd(18)}║
║ 💬 WhatsApp: ATIVO                ║
╚═══════════════════════════════════╝
  `)

  console.log("API online", PORT)
})

process.on("SIGTERM", () => {
  console.log("SIGTERM recebido, fechando servidor...")
  httpServer.close(() => {
    console.log("Servidor fechado")
    process.exit(0)
  })
})

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err)
})

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err)
  process.exit(1)
})

global.io = io

export { io }
