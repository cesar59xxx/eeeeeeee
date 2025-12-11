"use client"

import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Plus, Power, Trash2, Send, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { io, type Socket } from "socket.io-client"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://eeeeeeee-production.up.railway.app"
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || API_URL

interface Session {
  id: string
  name: string
  phone?: string
  profileName?: string
  profilePicUrl?: string
  status: string
  qrCode?: string
  isConnected?: boolean
}

interface Contact {
  id: string
  whatsappId: string
  name: string
  phoneNumber: string
  profilePicUrl?: string
  lastMessageAt?: string
}

interface Message {
  id: string
  contactId: string
  fromMe: boolean
  body: string
  mediaUrl?: string
  mediaType?: string
  timestamp: string
  status: string
}

export default function WhatsAppPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [newSessionName, setNewSessionName] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [qrSessionId, setQrSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.user?.id) {
          setUserId(session.user.id)
          console.log("[v0] User ID:", session.user.id)
        } else {
          console.warn("[v0] No session found")
        }
      } catch (error) {
        console.error("[v0] Auth error:", error)
      }
    }
    initAuth()
  }, [])

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = response.statusText
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorJson.message || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      console.error("[v0] Request Failed:", errorMessage)
      throw new Error(errorMessage)
    }

    return response.json()
  }, [])

  const loadSessions = useCallback(async () => {
    if (!userId) {
      console.log("[v0] Waiting for userId...")
      return
    }

    try {
      setIsLoading(true)
      console.log("[v0] Loading sessions for user:", userId)

      const data = await apiFetch(`/api/whatsapp/sessions?user_id=${encodeURIComponent(userId)}`)
      const rawSessions = data?.sessions || data || []

      const normalized: Session[] = rawSessions.map((s: any) => ({
        id: s.id,
        name: s.name || "Sem nome",
        phone: s.phoneNumber || s.phone_number,
        profileName: s.profileName,
        profilePicUrl: s.profilePicUrl,
        status: s.status,
        isConnected: s.isActive || s.is_active || s.status === "connected",
      }))

      console.log("[v0] Loaded", normalized.length, "sessions")
      setSessions(normalized)
      setError(null)
    } catch (error: any) {
      console.error("[v0] Failed to load sessions:", error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [userId, apiFetch])

  useEffect(() => {
    console.log("[v0] Connecting to WebSocket:", WS_URL)
    const newSocket = io(WS_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })

    newSocket.on("connect", () => {
      console.log("[v0] ✅ WebSocket connected")
    })

    newSocket.on("disconnect", () => {
      console.log("[v0] ⚠️ WebSocket disconnected")
    })

    newSocket.on("whatsapp:qr", ({ sessionId, qr }) => {
      console.log("[v0] QR received for:", sessionId)
      if (qrSessionId === sessionId) {
        setQrCodeData(qr)
      }
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, qrCode: qr, status: "qr" } : s)))
    })

    newSocket.on("whatsapp:connected", ({ sessionId }) => {
      console.log("[v0] Session connected:", sessionId)
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: "connected", isConnected: true } : s)),
      )
      setQrDialogOpen(false)
      setQrCodeData(null)
      loadSessions()
    })

    newSocket.on("whatsapp:session-updated", () => {
      console.log("[v0] Session updated, reloading...")
      loadSessions()
    })

    newSocket.on("whatsapp:message", ({ message }) => {
      console.log("[v0] New message received")
      setMessages((prev) => [...prev, message])
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [qrSessionId, loadSessions])

  useEffect(() => {
    if (!userId) {
      console.log("[v0] Skipping loadSessions - waiting for userId")
      setIsLoading(false)
      return
    }

    loadSessions()

    const interval = setInterval(() => {
      loadSessions()
    }, 30000)

    return () => clearInterval(interval)
  }, [userId, loadSessions])

  useEffect(() => {
    if (socket && selectedSessionId) {
      socket.emit("join-session", selectedSessionId)
      return () => {
        socket.emit("leave-session", selectedSessionId)
      }
    }
  }, [socket, selectedSessionId])

  const handleCreateSession = async () => {
    const name = newSessionName.trim()
    if (!name) {
      setError("Nome é obrigatório")
      return
    }

    if (!userId) {
      setError("Usuário não autenticado")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      console.log("[v0] Creating session:", name, "for user:", userId)

      const data = await apiFetch("/api/whatsapp/sessions", {
        method: "POST",
        body: JSON.stringify({
          name: name,
          user_id: userId,
        }),
      })

      if (!data.success && !data.id) {
        throw new Error(data.error || "Falha ao criar sessão")
      }

      const sessionId = data.id || data.session?.id
      if (!sessionId) {
        throw new Error("Session ID não foi retornado")
      }

      console.log("[v0] Session created:", sessionId)

      setNewSessionName("")
      setCreateDialogOpen(false)
      await loadSessions()

      await handleStartSession(sessionId)
    } catch (error: any) {
      console.error("[v0] Error creating session:", error)
      setError(error.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartSession = async (sessionId: string) => {
    try {
      console.log("[v0] Starting session:", sessionId)

      setQrSessionId(sessionId)
      setQrDialogOpen(true)
      setQrCodeData(null)

      await apiFetch(`/api/whatsapp/sessions/${sessionId}/start`, {
        method: "POST",
      })

      console.log("[v0] Session start requested")
    } catch (error: any) {
      console.error("[v0] Error:", error)
      alert(error.message)
      setQrDialogOpen(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Excluir esta sessão?")) return

    try {
      await apiFetch(`/api/whatsapp/sessions/${sessionId}`, {
        method: "DELETE",
      })

      await loadSessions()
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null)
      }
    } catch (error: any) {
      console.error("[v0] Error:", error)
      alert(error.message)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedSessionId || !selectedContact) return

    try {
      await apiFetch(`/api/whatsapp/sessions/${selectedSessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          to: selectedContact.whatsappId,
          body: newMessage,
        }),
      })

      setNewMessage("")
      loadMessages(selectedSessionId, selectedContact.id)
    } catch (error: any) {
      console.error("[v0] Error:", error)
      alert(error.message)
    }
  }

  const loadContacts = useCallback(
    async (sessionId: string) => {
      try {
        console.log("[v0] Loading contacts for session:", sessionId)
        const data = await apiFetch(`/api/whatsapp/sessions/${sessionId}/contacts`)
        setContacts(data.contacts || [])
        console.log("[v0] Loaded", data.contacts?.length, "contacts")
      } catch (error) {
        console.error("[v0] Error loading contacts:", error)
      }
    },
    [apiFetch],
  )

  const loadMessages = useCallback(
    async (sessionId: string, contactId?: string) => {
      try {
        console.log("[v0] Loading messages for session:", sessionId, "contact:", contactId)
        const url = contactId
          ? `/api/whatsapp/sessions/${sessionId}/messages?contactId=${contactId}`
          : `/api/whatsapp/sessions/${sessionId}/messages`
        const data = await apiFetch(url)
        setMessages(data.messages || [])
        console.log("[v0] Loaded", data.messages?.length, "messages")
      } catch (error) {
        console.error("[v0] Error loading messages:", error)
      }
    },
    [apiFetch],
  )

  const getStatusBadge = (status: string, isConnected?: boolean) => {
    if (isConnected || status === "connected") {
      return <Badge className="bg-green-500">Conectado</Badge>
    }
    if (status === "qr") return <Badge variant="secondary">Aguardando QR</Badge>
    if (status === "connecting") return <Badge className="bg-blue-500">Conectando</Badge>
    return <Badge variant="outline">Desconectado</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Você precisa estar autenticado para acessar esta página.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-8rem)]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Instâncias</h2>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-2">
            {sessions.length === 0 && (
              <Card>
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma instância criada
                </CardContent>
              </Card>
            )}
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`cursor-pointer transition-colors ${
                  selectedSessionId === session.id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setSelectedSessionId(session.id)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{session.name}</CardTitle>
                    {getStatusBadge(session.status, session.isConnected)}
                  </div>
                  {session.phone && <CardDescription className="text-xs">+{session.phone}</CardDescription>}
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex gap-2">
                    {!session.isConnected && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartSession(session.id)
                        }}
                        className="flex-1 text-xs"
                      >
                        <Power className="h-3 w-3 mr-1" />
                        Conectar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSession(session.id)
                      }}
                      className="text-xs"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Conversas</h2>
        {selectedSessionId ? (
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-2">
              {contacts.map((contact) => (
                <Card
                  key={contact.id}
                  className={`cursor-pointer ${selectedContact?.id === contact.id ? "border-primary" : ""}`}
                  onClick={() => setSelectedContact(contact)}
                >
                  <CardHeader className="p-3 flex flex-row items-center gap-3">
                    {contact.profilePicUrl ? (
                      <img
                        src={contact.profilePicUrl || "/placeholder.svg"}
                        alt={contact.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">{contact.name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-sm">{contact.name}</CardTitle>
                      <CardDescription className="text-xs">{contact.phoneNumber}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card>
            <CardContent className="p-4 text-center text-sm text-muted-foreground">Selecione uma instância</CardContent>
          </Card>
        )}
      </div>

      <div className="md:col-span-2">
        {selectedContact ? (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>{selectedContact.name}</CardTitle>
            </CardHeader>
            <Separator />
            <ScrollArea className="flex-1 p-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex mb-4 ${msg.fromMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-lg p-3 ${msg.fromMe ? "bg-primary text-white" : "bg-muted"}`}>
                    <p className="text-sm">{msg.body}</p>
                    {msg.mediaUrl && (
                      <img
                        src={msg.mediaUrl || "/placeholder.svg"}
                        alt="Media"
                        className="w-full h-auto rounded-lg mt-2"
                      />
                    )}
                  </div>
                </div>
              ))}
            </ScrollArea>
            <Separator />
            <div className="p-4 flex gap-2">
              <Input
                placeholder="Mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button onClick={handleSendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center text-muted-foreground">Selecione uma conversa</CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Instância WhatsApp</DialogTitle>
            <DialogDescription>Dê um nome para identificar esta conexão</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Ex: Vendas, Suporte..."
              />
            </div>
            <Button onClick={handleCreateSession} disabled={isCreating} className="w-full">
              {isCreating ? "Criando..." : "Criar Sessão"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
            <DialogDescription>Abra o WhatsApp no celular e escaneie o código</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {qrCodeData ? (
              <img src={qrCodeData || "/placeholder.svg"} alt="QR Code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
