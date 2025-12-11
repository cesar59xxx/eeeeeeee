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

  async getContacts(params?: { limit?: number; sessionId?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set("limit", String(params.limit))
    if (params?.sessionId) searchParams.set("sessionId", params.sessionId)
    const query = searchParams.toString() ? `?${searchParams.toString()}` : ""
    return this.request(`/api/contacts${query}`)
  }

  async getContact(contactId: string) {
    return this.request(`/api/contacts/${contactId}`)
  }

  async updateContact(contactId: string, data: any) {
    return this.request(`/api/contacts/${contactId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async sendMessage(data: { sessionId: string; contactId: string; content: any; type: string }) {
    return this.request("/api/messages", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Chatbot flow endpoints
  async getChatbotFlows() {
    return this.request("/api/chatbot/flows")
  }

  async getChatbotFlow(flowId: string) {
    return this.request(`/api/chatbot/flows/${flowId}`)
  }

  async createChatbotFlow(data: any) {
    return this.request("/api/chatbot/flows", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateChatbotFlow(flowId: string, data: any) {
    return this.request(`/api/chatbot/flows/${flowId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteChatbotFlow(flowId: string) {
    return this.request(`/api/chatbot/flows/${flowId}`, {
      method: "DELETE",
    })
  }

  async toggleChatbotFlow(flowId: string, isActive: boolean) {
    return this.request(`/api/chatbot/flows/${flowId}/toggle`, {
      method: "POST",
      body: JSON.stringify({ isActive }),
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

  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async delete(endpoint: string) {
    return this.request(endpoint, {
      method: "DELETE",
    })
  }
}

export const apiClient = new APIClient()

class SocketClient {
  private socket: Socket | null = null

  connect(token?: string) {
    if (this.socket?.connected) {
      console.log("[v0] SOCKET: Already connected")
      return this.socket
    }

    const socketURL = config.api.wsURL

    console.log("[v0] SOCKET: Connecting to:", socketURL)

    this.socket = io(socketURL, {
      auth: token ? { token } : undefined,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      withCredentials: true,
    })

    this.socket.on("connect", () => {
      console.log("[v0] SOCKET: ✅ Connected successfully to", socketURL)
    })

    this.socket.on("disconnect", (reason) => {
      console.log("[v0] SOCKET: Disconnected -", reason)
    })

    this.socket.on("connect_error", (error) => {
      console.error("[v0] SOCKET ERROR:", error.message)
      console.error("[v0] SOCKET ERROR: Failed to connect to", socketURL)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      console.log("[v0] SOCKET: Disconnecting...")
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket() {
    return this.socket
  }
}

export const socketClient = new SocketClient()
