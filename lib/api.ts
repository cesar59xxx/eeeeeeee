const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://eeeeeeee-production.up.railway.app"

export const api = {
  // Sessões WhatsApp
  async getSessions(userId: string) {
    const res = await fetch(`${API_URL}/api/whatsapp/sessions?user_id=${userId}`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async createSession(userId: string, name: string) {
    const res = await fetch(`${API_URL}/api/whatsapp/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, name }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async startSession(sessionId: string) {
    const res = await fetch(`${API_URL}/api/whatsapp/sessions/${sessionId}/start`, {
      method: "POST",
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async deleteSession(sessionId: string) {
    const res = await fetch(`${API_URL}/api/whatsapp/sessions/${sessionId}`, {
      method: "DELETE",
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  // Mensagens
  async getMessages(sessionId: string) {
    const res = await fetch(`${API_URL}/api/whatsapp/sessions/${sessionId}/messages`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async sendMessage(sessionId: string, to: string, message: string) {
    const res = await fetch(`${API_URL}/api/whatsapp/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, body: message }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}
