import { io, type Socket } from "socket.io-client"
import { config } from "./config"

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
