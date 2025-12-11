import { io, type Socket } from "socket.io-client"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://eeeeeeee-production.up.railway.app"

// Cliente de API simplificado
export const apiClient = {
  async get(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async post(endpoint: string, data?: any) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async put(endpoint: string, data?: any) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async delete(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}

// Cliente Socket.IO simplificado
let socketInstance: Socket | null = null

export const socketClient = {
  connect(token: string): Socket {
    if (socketInstance?.connected) {
      return socketInstance
    }

    socketInstance = io(API_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    })

    return socketInstance
  },

  disconnect() {
    if (socketInstance) {
      socketInstance.disconnect()
      socketInstance = null
    }
  },

  getSocket(): Socket | null {
    return socketInstance
  },
}
