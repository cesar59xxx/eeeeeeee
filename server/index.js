import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"
import QRCode from "qrcode"
import { whatsappManager } from "./services/whatsapp-manager.service.js"
import { supabase } from "./config/supabase.js"
import crypto from "crypto"

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
      sessionStatus: "/api/whatsapp/sessions/:sessionId/status",
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
          success: false,
          error: "Too many requests. Please wait.",
        })
      }
    }

    sessionRequestCache.set(cacheKey, now)

    const { data: sessions, error } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    res.json({
      success: true,
      sessions: sessions || [],
      data: sessions || [],
      total: sessions?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Error fetching sessions:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post("/api/whatsapp/sessions", async (req, res) => {
  try {
    const { name, tenantId } = req.body

    if (req.body.id) {
      console.error("[v0] ERROR: Client sent 'id' in request body, this should never happen")
      return res.status(400).json({
        success: false,
        error: "Invalid request: 'id' should not be sent",
      })
    }

    if (!name) {
      return res.status(400).json({ success: false, error: "Name is required" })
    }

    const sessionId = `session-${Date.now()}`

    let finalTenantId = tenantId

    if (!finalTenantId) {
      // Get or create a default tenant
      const { data: defaultTenant, error: tenantError } = await supabase
        .from("tenants")
        .select("id")
        .eq("name", "default")
        .single()

      if (defaultTenant) {
        finalTenantId = defaultTenant.id
      } else {
        // Create default tenant if it doesn't exist
        const { data: newTenant, error: createError } = await supabase
          .from("tenants")
          .insert({ name: "default" })
          .select("id")
          .single()

        if (createError) {
          console.error("[v0] Error creating default tenant:", createError)
          return res.status(500).json({
            success: false,
            error: "Failed to create default tenant",
          })
        }

        finalTenantId = newTenant.id
      }
    }

    console.log("[v0] Creating session:", { name, tenantId: finalTenantId, sessionId })

    // Check if session with this name already exists
    const { data: existing } = await supabase
      .from("whatsapp_sessions")
      .select("id, session_id, status, phone_number")
      .eq("name", name)
      .eq("tenant_id", finalTenantId)
      .single()

    if (existing) {
      return res.json({
        success: true,
        session: {
          id: existing.id,
          sessionId: existing.session_id,
          name: name,
          status: existing.status,
          phone: existing.phone_number,
        },
        message: "Session already exists",
      })
    }

    const { data: newSession, error: insertError } = await supabase
      .from("whatsapp_sessions")
      .insert([
        {
          session_id: sessionId,
          name: name,
          tenant_id: finalTenantId,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Supabase insert error:", insertError)
      throw insertError
    }

    console.log("[v0] Session created successfully:", newSession.id)

    res.json({
      success: true,
      session: {
        id: newSession.id,
        sessionId: newSession.session_id,
        name: newSession.name,
        status: newSession.status,
        phone: newSession.phone_number,
      },
    })
  } catch (error) {
    console.error("[v0] Error creating session:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post("/api/whatsapp/sessions/:sessionId/start", async (req, res) => {
  try {
    const { sessionId } = req.params
    console.log("[v0] POST /api/whatsapp/sessions/:sessionId/start:", sessionId)

    await whatsappManager.initializeSession(sessionId)

    await supabase.from("whatsapp_sessions").update({ status: "initializing" }).eq("session_id", sessionId)

    res.json({
      success: true,
      message: "Session initialization started",
    })
  } catch (error) {
    console.error("[v0] Error starting session:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get("/api/whatsapp/sessions/:sessionId/qr", async (req, res) => {
  try {
    const { sessionId } = req.params
    console.log("[v0] GET /api/whatsapp/sessions/:sessionId/qr:", sessionId)

    const { data: session, error } = await supabase
      .from("whatsapp_sessions")
      .select("qr_code, status")
      .eq("session_id", sessionId)
      .single()

    if (error) throw error

    let qrCodeDataUrl = null
    if (session.qr_code) {
      try {
        qrCodeDataUrl = await QRCode.toDataURL(session.qr_code, {
          margin: 1,
          scale: 5,
          errorCorrectionLevel: "M",
          width: 300,
        })
        console.log("[v0] QR code converted to data URL")
      } catch (error) {
        console.error("[v0] Error converting QR:", error)
      }
    }

    res.json({
      qr: qrCodeDataUrl,
      qrCode: qrCodeDataUrl,
      status: session.status,
      message: qrCodeDataUrl ? "Escaneie o QR code no WhatsApp" : "Conecte a sessão para gerar QR code",
    })
  } catch (error) {
    console.error("Error fetching QR code:", error)
    res.status(500).json({ error: error.message })
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

    // Get session UUID from session_id
    const { data: session } = await supabase.from("whatsapp_sessions").select("id").eq("session_id", sessionId).single()

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" })
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        *,
        contacts (
          id,
          name,
          phone,
          avatar_url
        )
      `)
      .eq("whatsapp_session_id", session.id)
      .order("timestamp", { ascending: true })

    if (error) throw error

    res.json({
      success: true,
      messages: messages || [],
      data: messages || [],
      total: messages?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Error fetching messages:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post("/api/whatsapp/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params
    const { to, body } = req.body

    console.log("[v0] POST /api/whatsapp/:sessionId/messages:", { sessionId, to, body })

    if (!to || !body) {
      return res.status(400).json({ success: false, error: "to and body are required" })
    }

    // Get session info
    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("id, tenant_id")
      .eq("session_id", sessionId)
      .single()

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" })
    }

    // Get or create contact
    const phoneNumber = to.split("@")[0]
    let { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("phone", phoneNumber)
      .eq("tenant_id", session.tenant_id)
      .single()

    if (!contact) {
      const { data: newContact } = await supabase
        .from("contacts")
        .insert([
          {
            id: crypto.randomUUID(),
            tenant_id: session.tenant_id,
            name: phoneNumber,
            phone: phoneNumber,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()
      contact = newContact
    }

    const content = {
      type: "text",
      text: body,
    }

    const sentMessage = await whatsappManager.sendMessage(sessionId, to, content)

    const messageData = {
      id: crypto.randomUUID(),
      tenant_id: session.tenant_id,
      whatsapp_session_id: session.id,
      contact_id: contact.id,
      from_me: true,
      body: body,
      timestamp: new Date().toISOString(),
      status: "sent",
      created_at: new Date().toISOString(),
    }

    const { error: insertError } = await supabase.from("messages").insert([messageData])

    if (insertError) {
      console.error("[v0] ERROR saving message:", insertError)
    }

    if (global.io) {
      global.io.to(sessionId).emit("whatsapp:message", messageData)
    }

    res.json({
      success: true,
      message: "Message sent successfully",
      data: sentMessage,
    })
  } catch (error) {
    console.error("[v0] ERROR sending message:", error)
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Failed to send WhatsApp message",
    })
  }
})

app.delete("/api/whatsapp/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params
    console.log("[v0] DELETE /api/whatsapp/sessions/:sessionId:", sessionId)

    await whatsappManager.disconnectSession(sessionId)

    const { error } = await supabase.from("whatsapp_sessions").delete().eq("session_id", sessionId)

    if (error) throw error

    res.json({
      success: true,
      message: "Sessão excluída com sucesso",
    })
  } catch (error) {
    console.error("Error deleting session:", error)
    res.status(500).json({ error: error.message })
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
      console.error("[v0] Error fetching messages:", error)
      throw error
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

app.get("/api/whatsapp/sessions/:sessionId/status", async (req, res) => {
  try {
    const { sessionId } = req.params
    console.log("[v0] GET /api/whatsapp/sessions/:sessionId/status:", sessionId)

    // Check if session is active in WhatsApp Manager
    const isActive = whatsappManager.isSessionActive(sessionId)
    const client = whatsappManager.getClient(sessionId)

    // Get session from database
    const { data: session, error } = await supabase
      .from("whatsapp_sessions")
      .select("status, phone_number, is_active, qr_code")
      .eq("session_id", sessionId)
      .single()

    if (error) {
      console.error("[v0] Session not found in database:", error)
      return res.status(404).json({
        ok: false,
        error: "Session not found",
      })
    }

    // Determine real-time status
    let status = session.status
    const qr = session.qr_code
    let phoneNumber = session.phone_number

    // If client is active, get real status from WhatsApp
    if (isActive && client) {
      const state = await client.getState().catch(() => null)

      if (state === "CONNECTED") {
        status = "connected"
        if (client.info) {
          phoneNumber = client.info.wid.user
        }
      } else if (state === "OPENING" || state === "PAIRING") {
        status = "qr"
      } else if (state === "UNPAIRED" || state === "UNPAIRED_IDLE") {
        status = "pending"
      }
    }

    // Response in the exact format requested
    const response = {
      ok: true,
      sessionId,
      status,
    }

    // Add optional fields
    if (qr && status === "qr") {
      response.qr = qr
    }

    if (phoneNumber && status === "connected") {
      response.phoneNumber = phoneNumber
    }

    console.log("[v0] Status response:", { sessionId, status, hasQR: !!qr, phoneNumber })

    res.json(response)
  } catch (error) {
    console.error("[v0] Error fetching session status:", error)
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.post("/api/whatsapp/send", async (req, res) => {
  try {
    console.log("[v0] POST /api/whatsapp/send:", req.body)
    const { sessionId, to, content } = req.body

    if (!sessionId || !to || !content) {
      return res.status(400).json({ error: "sessionId, to e content são obrigatórios" })
    }

    const sentMessage = await whatsappManager.sendMessage(sessionId, to, content)

    res.json({
      success: true,
      message: "Mensagem enviada com sucesso",
      messageId: sentMessage.id._serialized,
    })
  } catch (error) {
    console.error("Error sending message:", error)
    res.status(500).json({ error: error.message })
  }
})

app.post("/api/messages/send", async (req, res) => {
  try {
    const { sessionId, to, message } = req.body
    console.log("[v0] POST /api/messages/send:", { sessionId, to, message })

    if (!sessionId || !to || !message) {
      return res.status(400).json({ success: false, error: "sessionId, to and message are required" })
    }

    const content = {
      type: "text",
      text: message,
    }

    const sentMessage = await whatsappManager.sendMessage(sessionId, to, content)

    const messageData = {
      sessionId,
      from: sessionId,
      to,
      body: message,
      timestamp: Date.now() / 1000,
      direction: "outgoing",
    }

    await whatsappManager.saveMessage(sessionId, messageData)

    if (global.io) {
      global.io.emit("whatsapp:message", messageData)
    }

    res.json({
      success: true,
      message: "Message sent successfully",
      messageId: sentMessage?.id?._serialized,
    })
  } catch (error) {
    console.error("[v0] Error sending message:", error)
    res.status(500).json({ success: false, error: error.message })
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
