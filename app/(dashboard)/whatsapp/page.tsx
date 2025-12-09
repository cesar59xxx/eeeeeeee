"use client"

import { useEffect, useState, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Power, Trash2, Send, MessageCircle, User } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { io, type Socket } from "socket.io-client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface Session {
  _id: string
  sessionId: string
  name: string
  phoneNumber?: string
  status: string
  qrCode?: string
  lastConnected?: string
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
  const [qrCodeData, setQrCodeData] = useState<{ sessionId: string; qrCode: string | null; status: string } | null>(
    null,
  )
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL

    if (!socketUrl) {
      console.error("[SOCKET ERROR] NEXT_PUBLIC_SOCKET_URL or NEXT_PUBLIC_API_URL not configured")
      return
    }

    console.log("[v0] Connecting WebSocket to:", socketUrl)

    const socketConnection = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketConnection.on("connect", () => {
      console.log("[v0] WebSocket connected to", socketUrl)
    })

    socketConnection.on("connect_error", (error) => {
      console.error("[SOCKET ERROR] Failed to connect:", socketUrl, error.message)
    })

    socketConnection.on("whatsapp:qr", ({ sessionId, qr }) => {
      console.log("[v0] Received QR for session:", sessionId)
      setQrCodeData((prev) => (prev?.sessionId === sessionId ? { ...prev, qrCode: qr } : prev))
    })

    socketConnection.on("whatsapp:status", ({ sessionId, status }) => {
      console.log("[v0] Status update:", sessionId, status)

      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === sessionId
            ? {
                ...s,
                status: status === "ready" ? "connected" : status,
                isConnected: status === "ready" || status === "connected",
              }
            : s,
        ),
      )

      if (status === "ready" || status === "connected") {
        setQrDialogOpen(false)
        setQrCodeData(null)
      }
    })

    socketConnection.on("whatsapp:message", (messageData) => {
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

      setMessages((prev) => {
        if (newMsg.session_id === selectedSessionId) {
          return [...prev, newMsg]
        }
        return prev
      })

      updateContactsList(newMsg)
    })

    setSocket(socketConnection)

    return () => {
      socketConnection.disconnect()
    }
  }, [])

  useEffect(() => {
    if (socket && selectedSessionId) {
      socket.emit("join-session", selectedSessionId)
    }
  }, [socket, selectedSessionId])

  const loadSessions = useCallback(async () => {
    try {
      const response = await apiClient.getSessions()
      setSessions(response.sessions || response.data || [])
    } catch (error) {
      console.error("[v0] Failed to load sessions:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const response = await apiClient.getMessages(sessionId)
      setMessages(response.messages || response.data || [])

      const uniqueContacts = extractContactsFromMessages(response.messages || response.data || [])
      setContacts(uniqueContacts)
    } catch (error) {
      console.error("[v0] Failed to load messages:", error)
    }
  }, [])

  useEffect(() => {
    if (selectedSessionId) {
      const session = sessions.find((s) => s.sessionId === selectedSessionId)
      if (session?.isConnected) {
        loadMessages(selectedSessionId)
      } else {
        setMessages([])
        setContacts([])
        setSelectedContact(null)
      }
    }
  }, [selectedSessionId, sessions, loadMessages])

  const extractContactsFromMessages = (msgs: Message[]): Contact[] => {
    const contactMap = new Map<string, Contact>()

    msgs.forEach((msg) => {
      const contactNumber = msg.direction === "incoming" ? msg.from_number : msg.to_number

      if (!contactMap.has(contactNumber)) {
        contactMap.set(contactNumber, {
          whatsapp_id: contactNumber,
          name: contactNumber.replace(/\D/g, ""),
          lastMessage: msg.body,
        })
      }
    })

    return Array.from(contactMap.values())
  }

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

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return

    try {
      const result = await apiClient.createSession({ name: newSessionName })
      setNewSessionName("")
      setCreateDialogOpen(false)

      await loadSessions()

      setTimeout(() => {
        handleStartSession(result.session.sessionId)
      }, 1000)
    } catch (error: any) {
      console.error("[API ERROR] Failed to create session:", error.message)
      alert(error.message || "Erro ao criar sessão. Verifique se o backend está acessível.")
    }
  }

  const handleStartSession = async (sessionId: string) => {
    try {
      await apiClient.startSession(sessionId)

      setQrCodeData({ sessionId, qrCode: null, status: "qr" })
      setQrDialogOpen(true)

      const pollInterval = setInterval(async () => {
        try {
          const [qrResponse, statusResponse] = await Promise.all([
            apiClient.getQRCode(sessionId),
            apiClient.getSessionStatus(sessionId),
          ])

          setQrCodeData((prev) =>
            prev?.sessionId === sessionId
              ? {
                  sessionId,
                  qrCode: qrResponse.qr || prev.qrCode,
                  status: statusResponse.state || prev.status,
                }
              : prev,
          )

          if (statusResponse.state === "connected" || statusResponse.state === "ready") {
            clearInterval(pollInterval)
            setQrDialogOpen(false)
            setQrCodeData(null)
            await loadSessions()
          }
        } catch (error: any) {
          console.error("[API ERROR] Failed to poll QR/status:", error.message)
        }
      }, 2000)

      setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000)
    } catch (error: any) {
      console.error("[API ERROR] Failed to start session:", error.message)
      alert(error.message || "Erro ao iniciar sessão. Verifique se o backend está acessível.")
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
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
    if (isConnected || status === "connected" || status === "ready") {
      return <Badge className="bg-green-500">Conectado</Badge>
    }

    switch (status) {
      case "qr":
        return <Badge variant="secondary">Aguardando QR</Badge>
      case "authenticated":
        return <Badge className="bg-blue-500">Autenticando</Badge>
      case "disconnected":
        return <Badge variant="outline">Desconectado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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

  const currentMessages = messages.filter(
    (msg) =>
      selectedContact &&
      (msg.from_number === selectedContact.whatsapp_id || msg.to_number === selectedContact.whatsapp_id),
  )

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
                key={session._id}
                className={`cursor-pointer transition-colors ${
                  selectedSessionId === session.sessionId ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setSelectedSessionId(session.sessionId)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{session.name}</CardTitle>
                    {getStatusBadge(session.status, session.isConnected)}
                  </div>
                  {session.phoneNumber && <CardDescription className="text-xs">+{session.phoneNumber}</CardDescription>}
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex gap-2">
                    {!session.isConnected && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartSession(session.sessionId)
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
                        handleDeleteSession(session.sessionId)
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
                        <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString("pt-BR")}</p>
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
                  placeholder="Digite uma mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleSendMessage()
                  }}
                />
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Sessão</DialogTitle>
            <DialogDescription>Dê um nome para identificar esta sessão WhatsApp</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Ex: Atendimento Principal"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleCreateSession()
              }}
            />
            <Button onClick={handleCreateSession} className="w-full" disabled={!newSessionName.trim()}>
              Criar Sessão
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
            <DialogDescription>Abra o WhatsApp no seu celular e escaneie este código</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 min-h-[400px]">
            {qrCodeData?.qrCode ? (
              <img
                src={qrCodeData.qrCode || "/placeholder.svg"}
                alt="WhatsApp QR Code"
                width={300}
                height={300}
                style={{
                  imageRendering: "pixelated",
                  objectFit: "contain",
                }}
              />
            ) : (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
