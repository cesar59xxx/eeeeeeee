"use client"

import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useState, useCallback } from "react"
import { socketClient, apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Plus, Power, Trash2, Send, MessageCircle, User, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Session {
  id: string
  name: string
  phone?: string
  status: string
  qrCode?: string
  isConnected?: boolean
}

interface Message {
  id: string
  session_id: string
  from_number: string
  to_number: string
  body: string
  timestamp: string
  direction: "incoming" | "outgoing"
  status: string
}

interface Contact {
  whatsapp_id: string
  name: string
  lastMessage?: string
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

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true)
      console.log("[v0] Loading sessions...")

      const response = await apiClient.getSessions()
      console.log("[v0] Sessions response:", response)

      const rawSessions: any[] = response?.sessions || response?.data || []

      const normalized: Session[] = rawSessions
        .filter((s) => {
          const hasId = s.id && s.id !== "undefined" && s.id !== "null"
          if (!hasId) {
            console.warn("[v0] Session without valid ID ignored:", s)
          }
          return hasId
        })
        .map((s) => ({
          id: String(s.id),
          name: s.name || "Sem nome", // Use name field directly from backend
          phone: s.phone_number || s.phone || undefined,
          status: s.status || "disconnected",
          qrCode: s.qr_code || s.qrCode || undefined,
          isConnected: s.status === "connected" || s.status === "ready" || s.isConnected === true,
        }))

      console.log("[v0] Normalized sessions:", normalized)
      setSessions(normalized)
    } catch (error) {
      console.error("[v0] Failed to load sessions:", error)
      setError("Falha ao carregar sessões")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log("[v0] Connecting WebSocket...")
    const socket = socketClient.connect()

    socket.on("whatsapp:qr", ({ sessionId, qr }) => {
      console.log("[v0] QR Code received for session:", sessionId)

      if (qrSessionId === sessionId) {
        setQrCodeData(qr)
      }

      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, qrCode: qr, status: "qr" } : s)))
    })

    socket.on("whatsapp:status", ({ sessionId, status }) => {
      console.log("[v0] Status update:", sessionId, "->", status)

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: status === "ready" ? "connected" : status,
                isConnected: status === "ready" || status === "connected",
                qrCode: undefined,
              }
            : s,
        ),
      )

      if (status === "ready" || status === "connected") {
        setQrDialogOpen(false)
        setQrCodeData(null)
        setQrSessionId(null)

        if (selectedSessionId === sessionId) {
          loadContacts(sessionId)
        }
      }
    })

    socket.on("whatsapp:message", (messageData) => {
      console.log("[v0] New message:", messageData)

      const newMsg: Message = {
        id: messageData.id || Date.now().toString(),
        session_id: messageData.sessionId || messageData.session_id,
        from_number: messageData.from || messageData.from_number,
        to_number: messageData.to || messageData.to_number,
        body: messageData.body,
        timestamp: messageData.timestamp || new Date().toISOString(),
        direction: messageData.direction,
        status: messageData.status || "delivered",
      }

      if (newMsg.session_id === selectedSessionId) {
        setMessages((prev) => [...prev, newMsg])
        updateContactsList(newMsg)
      }
    })

    return () => {
      socketClient.disconnect()
    }
  }, [selectedSessionId, qrSessionId])

  useEffect(() => {
    if (!selectedSessionId) return

    const socket = socketClient.getSocket()
    if (socket) {
      console.log("[v0] Joining session room:", selectedSessionId)
      socket.emit("join-session", selectedSessionId)

      return () => {
        socket.emit("leave-session", selectedSessionId)
      }
    }
  }, [selectedSessionId])

  const loadContacts = useCallback(async (sessionId: string) => {
    try {
      const response = await apiClient.getContacts(sessionId, 100)
      setContacts(response.contacts || response.data || [])
    } catch (error) {
      console.error("[v0] Error loading contacts:", error)
    }
  }, [])

  const loadMessages = useCallback(async (sessionId: string, contactId?: string) => {
    try {
      const response = await apiClient.getMessages(sessionId, contactId)
      setMessages(response.messages || response.data || [])
    } catch (error) {
      console.error("[v0] Error loading messages:", error)
    }
  }, [])

  useEffect(() => {
    if (selectedSessionId) {
      const session = sessions.find((s) => s.id === selectedSessionId)
      if (session?.isConnected) {
        loadContacts(selectedSessionId)
      } else {
        setMessages([])
        setContacts([])
        setSelectedContact(null)
      }
    }
  }, [selectedSessionId, sessions, loadContacts])

  useEffect(() => {
    if (selectedSessionId && selectedContact) {
      loadMessages(selectedSessionId, selectedContact.whatsapp_id)
    }
  }, [selectedContact, selectedSessionId, loadMessages])

  const updateContactsList = (msg: Message) => {
    const contactNumber = msg.direction === "incoming" ? msg.from_number : msg.to_number

    setContacts((prev) => {
      const existing = prev.find((c) => c.whatsapp_id === contactNumber)
      if (existing) {
        return prev.map((c) => (c.whatsapp_id === contactNumber ? { ...c, lastMessage: msg.body } : c))
      }
      return [
        ...prev,
        {
          whatsapp_id: contactNumber,
          name: contactNumber.replace(/\D/g, ""),
          lastMessage: msg.body,
        },
      ]
    })
  }

  const handleStartSession = async (sessionId: string) => {
    if (!sessionId || sessionId === "undefined" || sessionId === "null" || sessionId.trim() === "") {
      console.error("[v0] handleStartSession: Invalid ID:", sessionId)
      alert("Erro: ID da sessão inválido")
      return
    }

    try {
      console.log("[v0] Starting session:", sessionId)

      setQrSessionId(sessionId)
      setQrDialogOpen(true)
      setQrCodeData(null)

      await apiClient.startSession(sessionId)
      console.log("[v0] Session started, waiting for QR via WebSocket...")
    } catch (error: any) {
      console.error("[v0] Error starting session:", error)
      alert(error.message || "Erro ao iniciar sessão")
      setQrDialogOpen(false)
      setQrSessionId(null)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!sessionId || sessionId === "undefined") {
      alert("Erro: ID da sessão inválido")
      return
    }

    if (!confirm("Deseja realmente excluir esta sessão?")) return

    try {
      await apiClient.deleteSession(sessionId)
      await loadSessions()

      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null)
        setSelectedContact(null)
      }
    } catch (error: any) {
      console.error("[v0] Error deleting session:", error)
      alert(error.message || "Erro ao excluir sessão")
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedSessionId || !selectedContact) return

    try {
      await apiClient.sendMessage(selectedSessionId, {
        to: selectedContact.whatsapp_id,
        body: newMessage,
      })

      const optimisticMsg: Message = {
        id: Date.now().toString(),
        session_id: selectedSessionId,
        from_number: selectedSessionId,
        to_number: selectedContact.whatsapp_id,
        body: newMessage,
        timestamp: new Date().toISOString(),
        direction: "outgoing",
        status: "sent",
      }

      setMessages((prev) => [...prev, optimisticMsg])
      setNewMessage("")
    } catch (error: any) {
      console.error("[v0] Error sending message:", error)
      alert(error.message || "Erro ao enviar mensagem")
    }
  }

  const getStatusBadge = (status: string, isConnected?: boolean) => {
    if (isConnected || status === "connected") {
      return <Badge className="bg-green-500">Conectado</Badge>
    }

    switch (status) {
      case "qr":
        return <Badge variant="secondary">Aguardando QR</Badge>
      case "authenticated":
      case "initializing":
        return <Badge className="bg-blue-500">Conectando...</Badge>
      case "disconnected":
        return <Badge variant="outline">Desconectado</Badge>
      case "error":
        return <Badge variant="destructive">Erro</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleCreateSession = async () => {
    const name = newSessionName.trim()

    if (!name) {
      setError("Nome da sessão é obrigatório")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      console.log("[v0] Creating session with name:", name)

      const response = await apiClient.createSession({ name })
      console.log("[v0] createSession response:", response)

      if (!response || !response.success) {
        throw new Error(response?.error || "Falha ao criar sessão")
      }

      if (!response.session || !response.session.id) {
        console.error("[v0] Invalid response - missing session.id:", response)
        throw new Error("Servidor não retornou ID da sessão")
      }

      const sessionId = response.session.id
      console.log("[v0] Session created with ID:", sessionId)

      setNewSessionName("")
      setCreateDialogOpen(false)

      await loadSessions()

      console.log("[v0] Auto-starting session:", sessionId)
      await handleStartSession(sessionId)
    } catch (error: any) {
      console.error("[v0] Error creating session:", error)
      setError(error.message || "Erro ao criar sessão")
    } finally {
      setIsCreating(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

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

  const currentMessages = messages.filter(
    (msg) =>
      selectedContact &&
      (msg.from_number === selectedContact.whatsapp_id || msg.to_number === selectedContact.whatsapp_id),
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-8rem)]">
      {/* Column 1: Instances */}
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

      {/* Column 2: Conversations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Conversas</h2>
        </div>

        {selectedSessionId ? (
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-2">
              {contacts.length === 0 && (
                <Card>
                  <CardContent className="p-4 text-center text-sm text-muted-foreground">
                    Nenhuma conversa ainda
                  </CardContent>
                </Card>
              )}
              {contacts.map((contact) => (
                <Card
                  key={contact.whatsapp_id}
                  className={`cursor-pointer transition-colors ${
                    selectedContact?.whatsapp_id === contact.whatsapp_id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => setSelectedContact(contact)}
                >
                  <CardHeader className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm truncate">{contact.name}</CardTitle>
                        <CardDescription className="text-xs truncate">{contact.lastMessage}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center text-sm text-muted-foreground">Selecione uma instância</CardContent>
          </Card>
        )}
      </div>

      {/* Columns 3-4: Chat */}
      <div className="md:col-span-2">
        {!selectedSessionId ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Selecione uma instância para ver as mensagens</p>
            </CardContent>
          </Card>
        ) : !selectedContact ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Selecione uma conversa para ver as mensagens</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>{selectedContact.name}</CardTitle>
                  <CardDescription>{selectedContact.whatsapp_id}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[calc(100vh-20rem)] p-4">
                <div className="space-y-4">
                  {currentMessages.length === 0 && (
                    <p className="text-center text-muted-foreground">Nenhuma mensagem ainda</p>
                  )}
                  {currentMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.direction === "outgoing" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg.body}</p>
                        <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <Separator />
            <div className="p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Create Session Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Instância</DialogTitle>
            <DialogDescription>Digite um nome para identificar esta instância do WhatsApp</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="session-name">Nome da Instância</Label>
              <Input
                id="session-name"
                placeholder="Ex: Vendas, Suporte, Principal..."
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreating) {
                    handleCreateSession()
                  }
                }}
                disabled={isCreating}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
                Cancelar
              </Button>
              <Button onClick={handleCreateSession} disabled={isCreating || !newSessionName.trim()}>
                {isCreating ? "Criando..." : "Criar e Conectar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
            <DialogDescription>Abra o WhatsApp no seu celular e escaneie o código QR para conectar</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6">
            {!qrCodeData ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg">
                <img src={qrCodeData || "/placeholder.svg"} alt="QR Code" className="w-64 h-64" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
