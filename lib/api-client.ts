import { io, type Socket } from "socket.io-client"
import { config } from "./config"

class APIClient {
  private baseURL: string
  private token: string | null = null

  constructor() {
    this.baseURL = config.api.baseURL
    console.log("[API] Initialized with baseURL:", this.baseURL)

    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("accessToken")
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    const fullUrl = `${this.baseURL}${endpoint}`

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: "include",
      })

      if (response.status === 401) {
        const refreshed = await this.refreshToken()
        if (refreshed) {
          return this.request(endpoint, options)
        } else {
          this.clearToken()
          if (typeof window !== "undefined") {
            window.location.href = "/login"
          }
          throw new Error("Session expired")
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(error.error || error.message || `Request failed with status ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      console.error("[API ERROR]", fullUrl, error.message)
      throw error
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (typeof window === "undefined") return false

    const refreshToken = localStorage.getItem("refreshToken")
    if (!refreshToken) return false

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        this.setToken(data.tokens.accessToken)
        localStorage.setItem("refreshToken", data.tokens.refreshToken)
        return true
      }
    } catch (error) {
      console.error("[API ERROR] Token refresh failed:", error)
    }

    return false
  }

  // Auth endpoints
  async register(data: any) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async login(data: any) {
    const result = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    })

    this.setToken(result.tokens.accessToken)
    if (typeof window !== "undefined") {
      localStorage.setItem("refreshToken", result.tokens.refreshToken)
    }

    return result
  }

  async logout() {
    await this.request("/api/auth/logout", { method: "POST" })
    this.clearToken()
  }

  async getCurrentUser() {
    return this.request("/api/auth/me")
  }

  async getSessions() {
    return this.request("/api/whatsapp/sessions")
  }

  async createSession(data: { name: string }) {
    return this.request("/api/whatsapp/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async startSession(sessionId: string) {
    return this.request(`/api/whatsapp/sessions/${sessionId}/start`, {
      method: "POST",
    })
  }

  async deleteSession(sessionId: string) {
    return this.request(`/api/whatsapp/sessions/${sessionId}`, {
      method: "DELETE",
    })
  }

  async getQRCode(sessionId: string) {
    return this.request(`/api/whatsapp/sessions/${sessionId}/qr`)
  }

  async getSessionStatus(sessionId: string) {
    return this.request(`/api/whatsapp/sessions/${sessionId}/status`)
  }

  async getContacts(sessionId: string, limit?: number) {
    const params = new URLSearchParams()
    if (limit) params.set("limit", String(limit))
    const query = params.toString() ? `?${params.toString()}` : ""
    return this.request(`/api/whatsapp/${sessionId}/contacts${query}`)
  }

  async getMessages(sessionId: string, contactId?: string) {
    const endpoint = contactId
      ? `/api/whatsapp/${sessionId}/messages/${contactId}`
      : `/api/whatsapp/${sessionId}/messages`
    return this.request(endpoint)
  }

  async sendMessage(sessionId: string, data: { to: string; body: string }) {
    return this.request(`/api/whatsapp/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Generic methods
  async get(endpoint: string) {
    return this.request(endpoint)
  }

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }
}

export const apiClient = new APIClient()

class SocketClient {
  private socket: Socket | null = null

  connect(token?: string) {
    if (this.socket?.connected) {
      console.log("[SOCKET] Already connected")
      return this.socket
    }

    const socketURL = config.api.wsURL

    console.log("[SOCKET] Connecting to:", socketURL)

    this.socket = io(socketURL, {
      auth: token ? { token } : undefined,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    this.socket.on("connect", () => {
      console.log("[SOCKET] ✅ Connected successfully")
    })

    this.socket.on("disconnect", () => {
      console.log("[SOCKET] Disconnected")
    })

    this.socket.on("connect_error", (error) => {
      console.error("[SOCKET ERROR]", error.message)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket() {
    return this.socket
  }
}

export const socketClient = new SocketClient()
