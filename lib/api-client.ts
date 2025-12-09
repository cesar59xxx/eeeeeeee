import { io, type Socket } from "socket.io-client"

class APIClient {
  private baseURL: string
  private token: string | null = null

  constructor() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
    this.baseURL = apiUrl

    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("accessToken")
    }
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem("accessToken", token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      })

      if (response.status === 401) {
        const refreshed = await this.refreshToken()
        if (refreshed) {
          return this.request(endpoint, options)
        } else {
          this.clearToken()
          window.location.href = "/login"
          throw new Error("Session expired")
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(error.error || `Request failed with status ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      console.error("[v0] Request Failed:", error.message)
      throw error
    }
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refreshToken")
    if (!refreshToken) return false

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })

      if (response.ok) {
        const data = await response.json()
        this.setToken(data.tokens.accessToken)
        localStorage.setItem("refreshToken", data.tokens.refreshToken)
        return true
      }
    } catch (error) {
      console.error("Failed to refresh token:", error)
    }

    return false
  }

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
    localStorage.setItem("refreshToken", result.tokens.refreshToken)

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

  async getMessages(sessionId: string) {
    return this.request(`/api/whatsapp/${sessionId}/messages`)
  }

  async sendMessage(sessionId: string, data: { to: string; body: string }) {
    return this.request(`/api/whatsapp/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

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

// Socket.IO Client
class SocketClient {
  private socket: Socket | null = null

  connect(token: string) {
    if (this.socket?.connected) return this.socket

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:3001"

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket"],
    })

    this.socket.on("connect", () => {
      console.log("[v0] Socket Connected")
    })

    this.socket.on("disconnect", () => {
      console.log("[v0] Socket Disconnected")
    })

    this.socket.on("connect_error", (error) => {
      console.error("[v0] Socket connection error:", error)
    })

    return this.socket
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  getSocket() {
    return this.socket
  }
}

export const socketClient = new SocketClient()
