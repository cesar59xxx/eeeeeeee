import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"

dotenv.config()

console.log("🚀 WhatsApp CRM Backend v3.0 iniciando...")
console.log("🌍 Environment:", process.env.NODE_ENV || "development")
console.log("🔧 Port:", process.env.PORT || 3001)

const app = express()
const httpServer = createServer(app)

const allowedOrigins = ["http://localhost:3000", "https://eeeeeeee-eight.vercel.app", process.env.FRONTEND_URL].filter(
  Boolean,
)

console.log("🌐 CORS enabled for:", allowedOrigins)

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
})

// Make io globally available
global.io = io

// ========== MIDDLEWARE ==========
app.use(helmet({ contentSecurityPolicy: false }))
app.use(compression())
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
})
app.use("/api/", limiter)

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "WhatsApp CRM Backend v3.0",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      api: "/api/whatsapp",
    },
  })
})

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

let whatsappManager = null
let supabase = null

// Try to load Supabase and WhatsApp services
try {
  const supabaseModule = await import("./config/supabase.js")
  supabase = supabaseModule.supabase
  console.log("✅ Supabase importado com sucesso")
} catch (error) {
  console.error("⚠️ Erro ao importar Supabase:", error.message)
}

try {
  const whatsappModule = await import("./services/whatsapp-manager.service.js")
  whatsappManager = whatsappModule.whatsappManager
  console.log("✅ WhatsApp Manager importado com sucesso")
} catch (error) {
  console.error("⚠️ Erro ao importar WhatsApp Manager:", error.message)
}

// Import auth middleware
let authenticateUser = null
let requireAuth = null

try {
  const authModule = await import("./middleware/auth.js")
  authenticateUser = authModule.authenticateUser
  requireAuth = authModule.requireAuth
  console.log("✅ Auth middleware importado com sucesso")
} catch (error) {
  console.error("⚠️ Erro ao importar Auth middleware:", error.message)
}

// ========== API ROUTES ==========

const checkServices = (req, res, next) => {
  if (!supabase || !whatsappManager) {
    return res.status(503).json({
      error: "Serviços não disponíveis. Configure as variáveis de ambiente.",
    })
  }
  next()
}

// Create session
app.post("/api/whatsapp/sessions", checkServices, async (req, res) => {
  try {
    const { name, user_id } = req.body

    if (!name || !user_id) {
      return res.status(400).json({ error: "Name and user_id are required" })
    }

    const { data, error } = await supabase
      .from("whatsapp_sessions")
      .insert([
        {
          user_id,
          name,
          status: "initializing",
          is_active: true,
        },
      ])
      .select()
      .single()

    if (error) throw error

    await whatsappManager.initializeSession(data.id)

    res.json(data)
  } catch (error) {
    console.error("Error creating session:", error)
    res.status(500).json({ error: error.message })
  }
})

// Get all sessions
app.get("/api/whatsapp/sessions", checkServices, async (req, res) => {
  try {
    const { user_id } = req.query

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" })
    }

    const { data, error } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })

    if (error) throw error

    res.json(data || [])
  } catch (error) {
    console.error("Error fetching sessions:", error)
    res.status(500).json({ error: error.message })
  }
})

// Get single session
app.get("/api/whatsapp/sessions/:sessionId", checkServices, async (req, res) => {
  try {
    const { sessionId } = req.params

    const { data, error } = await supabase.from("whatsapp_sessions").select("*").eq("id", sessionId).single()

    if (error) throw error

    res.json(data)
  } catch (error) {
    console.error("Error fetching session:", error)
    res.status(500).json({ error: error.message })
  }
})

// Delete session
app.delete("/api/whatsapp/sessions/:sessionId", checkServices, async (req, res) => {
  try {
    const { sessionId } = req.params

    await whatsappManager.disconnectSession(sessionId)

    const { error } = await supabase
      .from("whatsapp_sessions")
      .update({
        is_active: false,
        status: "disconnected",
      })
      .eq("id", sessionId)

    if (error) throw error

    res.json({ message: "Session deleted successfully" })
  } catch (error) {
    console.error("Error deleting session:", error)
    res.status(500).json({ error: error.message })
  }
})

// Send message
app.post("/api/whatsapp/sessions/:sessionId/send", checkServices, async (req, res) => {
  try {
    const { sessionId } = req.params
    const { to, message } = req.body

    if (!to || !message) {
      return res.status(400).json({ error: "to and message are required" })
    }

    const formattedNumber = to.includes("@") ? to : `${to}@c.us`

    const sentMessage = await whatsappManager.sendMessage(sessionId, formattedNumber, {
      type: "text",
      text: message,
    })

    res.json({
      success: true,
      messageId: sentMessage.id._serialized,
    })
  } catch (error) {
    console.error("Error sending message:", error)
    res.status(500).json({ error: error.message })
  }
})

// Get contacts
app.get("/api/whatsapp/contacts", checkServices, async (req, res) => {
  try {
    const { session_id, user_id } = req.query

    if (!session_id || !user_id) {
      return res.status(400).json({ error: "session_id and user_id are required" })
    }

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("session_id", session_id)
      .eq("user_id", user_id)
      .order("last_message_at", { ascending: false })

    if (error) throw error

    res.json(data || [])
  } catch (error) {
    console.error("Error fetching contacts:", error)
    res.status(500).json({ error: error.message })
  }
})

// Get messages for a contact
app.get("/api/whatsapp/messages", checkServices, async (req, res) => {
  try {
    const { contact_id, session_id } = req.query

    if (!contact_id || !session_id) {
      return res.status(400).json({ error: "contact_id and session_id are required" })
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("contact_id", contact_id)
      .eq("session_id", session_id)
      .order("timestamp", { ascending: true })

    if (error) throw error

    res.json(data || [])
  } catch (error) {
    console.error("Error fetching messages:", error)
    res.status(500).json({ error: error.message })
  }
})

// ========== SOCKET.IO ==========

io.on("connection", (socket) => {
  console.log("✅ Socket client connected:", socket.id)

  socket.on("disconnect", () => {
    console.log("❌ Socket client disconnected:", socket.id)
  })

  socket.on("whatsapp:create_session", async (data) => {
    try {
      const { name, user_id } = data

      const { data: session, error } = await supabase
        .from("whatsapp_sessions")
        .insert([
          {
            user_id,
            name,
            status: "initializing",
            is_active: true,
          },
        ])
        .select()
        .single()

      if (error) throw error

      if (whatsappManager) {
        await whatsappManager.initializeSession(session.id)
      }

      socket.emit("whatsapp:session_created", session)
    } catch (error) {
      console.error("Error creating session:", error)
      socket.emit("whatsapp:error", { error: error.message })
    }
  })
})

app.use((err, req, res, next) => {
  console.error("❌ Erro não tratado:", err)
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  })
})

// ========== START SERVER ==========

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`)
  console.log(`🌐 CORS enabled for:`, allowedOrigins)
  console.log(`📡 Server listening on 0.0.0.0:${PORT}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
})

process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...")
  httpServer.close(() => {
    console.log("Server closed")
    process.exit(0)
  })
})

process.on("SIGINT", () => {
  console.log("SIGINT received, closing server...")
  httpServer.close(() => {
    console.log("Server closed")
    process.exit(0)
  })
})

export { io }
