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
import { authenticateUser, requireAuth } from "./middleware/auth.js"

dotenv.config()

console.log("🚀 WhatsApp CRM Backend v3.0 iniciando...")

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://eeeeeeee-eight.vercel.app", process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
  },
})

global.io = io

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
app.use(compression())
app.use(
  cors({
    origin: ["http://localhost:3000", "https://eeeeeeee-eight.vercel.app", process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 })
app.use("/api/", limiter)

app.use("/api/whatsapp", authenticateUser)

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "WhatsApp CRM Backend v3.0",
    version: "3.0.0",
    endpoints: {
      health: "/health",
      api: "/api/whatsapp",
    },
  })
})

app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "3.0.0" })
})

app.get("/api/whatsapp/sessions", requireAuth, async (req, res) => {
  try {
    console.log("[v0] GET /api/whatsapp/sessions - User:", req.user.id)

    const { data: sessions, error } = await supabase
      .from("whatsapp_sessions")
      .select("id, session_name, whatsapp_phone, whatsapp_name, profile_pic_url, status, qr_code, is_active")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    const sessionsWithStatus = sessions.map((s) => ({
      id: s.id,
      name: s.session_name || "Sem nome",
      phoneNumber: s.whatsapp_phone,
      profileName: s.whatsapp_name,
      profilePicUrl: s.profile_pic_url,
      status: s.status,
      isActive: s.is_active && whatsappManager.isSessionActive(s.id),
      qrCode: s.qr_code,
    }))

    console.log(`[v0] Returning ${sessionsWithStatus.length} sessions for user ${req.user.id}`)

    res.json({ success: true, sessions: sessionsWithStatus })
  } catch (error) {
    console.error("[v0] Error:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get("/api/whatsapp/sessions/:sessionId/messages", requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params
    const { contactId } = req.query

    console.log("[v0] GET messages for session:", sessionId, "contact:", contactId)

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", req.user.id)
      .single()

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" })
    }

    let query = supabase
      .from("messages")
      .select("id, contact_id, direction, body, media_url, type, timestamp, status, created_at")
      .eq("session_id", sessionId)
      .eq("user_id", req.user.id)

    if (contactId) {
      query = query.eq("contact_id", contactId)
    }

    const { data: messages, error } = await query.order("timestamp", { ascending: true }).limit(100)

    if (error) throw error

    const normalizedMessages = messages.map((m) => ({
      id: m.id,
      contactId: m.contact_id,
      fromMe: m.direction === "outgoing",
      body: m.body,
      mediaUrl: m.media_url,
      mediaType: m.type,
      timestamp: m.timestamp,
      status: m.status,
    }))

    res.json({ success: true, messages: normalizedMessages })
  } catch (error) {
    console.error("[v0] Error:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post("/api/whatsapp/sessions", requireAuth, async (req, res) => {
  try {
    const { name } = req.body
    console.log("[v0] Creating session for user:", req.user.id, "name:", name)

    if (!name) {
      return res.status(400).json({ success: false, error: "Name is required" })
    }

    const { data: session, error } = await supabase
      .from("whatsapp_sessions")
      .insert([
        {
          user_id: req.user.id,
          session_name: name,
          status: "disconnected",
          is_active: false,
        },
      ])
      .select()
      .single()

    if (error) throw error

    console.log("[v0] ✅ Session created:", session.id)

    res.status(201).json({
      success: true,
      session: {
        id: session.id,
        name: session.session_name,
        status: session.status,
      },
    })
  } catch (error) {
    console.error("[v0] Error:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post("/api/whatsapp/sessions/:id/start", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    console.log("[v0] Starting session:", id, "for user:", req.user.id)

    const { data: session, error } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single()

    if (error || !session) {
      return res.status(404).json({ success: false, error: "Session not found or access denied" })
    }

    // Atualizar status
    await supabase.from("whatsapp_sessions").update({ status: "connecting" }).eq("id", id)

    // Inicializar WhatsApp em background
    setImmediate(() => {
      whatsappManager.initializeSession(id).catch((err) => {
        console.error("[v0] Error initializing:", err)
      })
    })

    res.json({ success: true, message: "Session starting" })
  } catch (error) {
    console.error("[v0] Error:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete("/api/whatsapp/sessions/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    // Verificar propriedade
    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single()

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" })
    }

    // Desconectar WhatsApp
    await whatsappManager.disconnectSession(id)

    // Deletar do banco
    await supabase.from("whatsapp_sessions").delete().eq("id", id)

    res.json({ success: true })
  } catch (error) {
    console.error("[v0] Error:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get("/api/whatsapp/sessions/:sessionId/contacts", requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params
    const limit = req.query.limit ? Number.parseInt(req.query.limit) : 50

    console.log("[v0] GET /api/whatsapp/sessions/:sessionId/contacts:", sessionId)

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", req.user.id)
      .single()

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" })
    }

    const { data: contacts, error } = await supabase
      .from("contacts")
      .select("id, name, profile_name, whatsapp_number, phone_number, profile_pic_url, last_message_at, created_at")
      .eq("user_id", req.user.id)
      .eq("session_id", sessionId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) throw error

    const contactsList = contacts.map((c) => ({
      id: c.id,
      whatsappId: c.whatsapp_number || c.phone_number,
      name: c.name || c.profile_name || c.whatsapp_number || "Sem nome",
      phoneNumber: c.phone_number || c.whatsapp_number,
      profilePicUrl: c.profile_pic_url,
      lastMessageAt: c.last_message_at,
    }))

    res.json({
      success: true,
      contacts: contactsList,
      total: contactsList.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching contacts:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get("/api/whatsapp/sessions/:sessionId/messages", requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params
    const { contactId } = req.query

    console.log("[v0] GET messages for session:", sessionId, "contact:", contactId)

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", req.user.id)
      .single()

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" })
    }

    let query = supabase
      .from("messages")
      .select("id, contact_id, direction, body, media_url, type, timestamp, status, created_at")
      .eq("session_id", sessionId)
      .eq("user_id", req.user.id)

    if (contactId) {
      query = query.eq("contact_id", contactId)
    }

    const { data: messages, error } = await query.order("timestamp", { ascending: true }).limit(100)

    if (error) throw error

    const normalizedMessages = messages.map((m) => ({
      id: m.id,
      contactId: m.contact_id,
      fromMe: m.direction === "outgoing",
      body: m.body,
      mediaUrl: m.media_url,
      mediaType: m.type,
      timestamp: m.timestamp,
      status: m.status,
    }))

    res.json({ success: true, messages: normalizedMessages })
  } catch (error) {
    console.error("[v0] Error:", error)
    res.status(500).json({ success: false, error: error.message })
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

app.get("/api/whatsapp/chatbot/flows", requireAuth, async (req, res) => {
  try {
    const { data: flows, error } = await supabase
      .from("chatbot_flows")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    res.json({ success: true, flows })
  } catch (error) {
    console.error("[v0] Error fetching chatbot flows:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post("/api/whatsapp/chatbot/flows", requireAuth, async (req, res) => {
  try {
    const { name, whatsapp_session_id, prompt, is_active, business_hours } = req.body

    if (!name || !whatsapp_session_id) {
      return res.status(400).json({ success: false, error: "Name and session are required" })
    }

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("id")
      .eq("id", whatsapp_session_id)
      .eq("user_id", req.user.id)
      .single()

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" })
    }

    const { data: flow, error } = await supabase
      .from("chatbot_flows")
      .insert([
        {
          user_id: req.user.id,
          tenant_id: req.user.tenant_id,
          whatsapp_session_id,
          name,
          prompt: prompt || "Você é um assistente útil.",
          is_active: is_active !== undefined ? is_active : false,
          business_hours: business_hours || {},
        },
      ])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ success: true, flow })
  } catch (error) {
    console.error("[v0] Error creating chatbot flow:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put("/api/whatsapp/chatbot/flows/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Verificar propriedade
    const { data: flow } = await supabase
      .from("chatbot_flows")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single()

    if (!flow) {
      return res.status(404).json({ success: false, error: "Flow not found" })
    }

    const { data: updated, error } = await supabase.from("chatbot_flows").update(updates).eq("id", id).select().single()

    if (error) throw error

    res.json({ success: true, flow: updated })
  } catch (error) {
    console.error("[v0] Error updating chatbot flow:", error)
    res.status(500).json({ success: false, error: error.message })
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

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`)
  console.log(
    `🌐 CORS enabled for:`,
    ["http://localhost:3000", "https://eeeeeeee-eight.vercel.app", process.env.FRONTEND_URL].filter(Boolean),
  )
})

export { io }
