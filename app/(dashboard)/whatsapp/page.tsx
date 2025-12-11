"use client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useState } from "react"
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
import { api } from "@/lib/api"

const WS_URL = process.env.NEXT_PUBLIC_API_URL || "https://eeeeeeee-production.up.railway.app"

interface Session {
  id: string
  name: string
  status: string
  isConnected: boolean
}

interface Message {
  id: string
  from: string
  body: string
  timestamp: string
  fromMe: boolean
}

export default function WhatsAppPage() {
  const [userId, setUserId] = useState<string>("")
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newSessionName, setNewSessionName] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrCode, setQrCode] = useState<string>("")
  const [messageText, setMessageText] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [error, setError] = useState<string>("")
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  // Pegar user_id do Supabase
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setUserId(session.user.id)
        console.log("[v0] User ID:", session.user.id)
      } else {
        setError("Você precisa estar logado")
      }
      setIsLoading(false)
    }
    getUser()
  }, [])

  // Conectar WebSocket
  useEffect(() => {
    console.log("[v0] Connecting WebSocket to:", WS_URL)
    const newSocket = io(WS_URL, {
      transports: ["websocket", "polling"],
    })

    newSocket.on("connect", () => console.log("[v0] WebSocket connected"))
    newSocket.on("disconnect", () => console.log("[v0] WebSocket disconnected"))

    newSocket.on("whatsapp:qr", ({ sessionId, qr }) => {
      console.log("[v0] QR received for session:", sessionId)
      setQrCode(qr)
    })

    newSocket.on("whatsapp:connected", ({ sessionId }) => {
      console.log("[v0] Session connected:", sessionId)
      setQrDialogOpen(false)
      setQrCode("")
      loadSessions()
    })

    newSocket.on("whatsapp:message", ({ message }) => {
      console.log("[v0] New message:", message)
      setMessages((prev) => [...prev, message])
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // Carregar sessões
  const loadSessions = async () => {
    if (!userId) return

    try {
      console.log("[v0] Loading sessions for user:", userId)
      const data = await api.getSessions(userId)
      const sessions = (data.sessions || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        isConnected: s.status === "connected" || s.isActive,
      }))
      setSessions(sessions)
      console.log("[v0] Loaded", sessions.length, "sessions")
    } catch (err: any) {
      console.error("[v0] Error loading sessions:", err)
      setError(err.message)
    }
  }

  useEffect(() => {
    if (userId) {
      loadSessions()
    }
  }, [userId])

  // Criar sessão
  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      setError("Nome é obrigatório")
      return
    }

    try {
      console.log("[v0] Creating session:", newSessionName)
      const data = await api.createSession(userId, newSessionName)
      console.log("[v0] Session created:", data)

      setCreateDialogOpen(false)
      setNewSessionName("")
      await loadSessions()

      // Iniciar sessão e pegar QR
      const sessionId = data.id || data.session?.id
      if (sessionId) {
        setQrDialogOpen(true)
        await api.startSession(sessionId)
      }
    } catch (err: any) {
      console.error("[v0] Error creating session:", err)
      setError(err.message)
    }
  }

  // Conectar sessão existente
  const handleConnectSession = async (sessionId: string) => {
    try {
      setQrDialogOpen(true)
      setQrCode("")
      await api.startSession(sessionId)
    } catch (err: any) {
      console.error("[v0] Error connecting:", err)
      setError(err.message)
      setQrDialogOpen(false)
    }
  }

  // Deletar sessão
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Excluir esta sessão?")) return

    try {
      await api.deleteSession(sessionId)
      await loadSessions()
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null)
      }
    } catch (err: any) {
      console.error("[v0] Error deleting:", err)
      setError(err.message)
    }
  }

  // Carregar mensagens
  const loadMessages = async (sessionId: string) => {
    try {
      const data = await api.getMessages(sessionId)
      setMessages(data.messages || [])
    } catch (err: any) {
      console.error("[v0] Error loading messages:", err)
    }
  }

  // Enviar mensagem
  const handleSendMessage = async () => {
    if (!selectedSession || !phoneNumber.trim() || !messageText.trim()) return

    try {
      await api.sendMessage(selectedSession.id, phoneNumber, messageText)
      setMessageText("")
      await loadMessages(selectedSession.id)
    } catch (err: any) {
      console.error("[v0] Error sending:", err)
      setError(err.message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!userId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Você precisa estar autenticado para usar o WhatsApp.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">WhatsApp</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Instância
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lista de Sessões */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Instâncias</h2>
          {sessions.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma instância criada</p>}

          {sessions.map((session) => (
            <Card
              key={session.id}
              className={`cursor-pointer ${selectedSession?.id === session.id ? "border-primary" : ""}`}
              onClick={() => {
                setSelectedSession(session)
                if (session.isConnected) {
                  loadMessages(session.id)
                }
              }}
            >
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  {session.name}
                  {session.isConnected ? (
                    <Badge className="bg-green-500">Conectado</Badge>
                  ) : (
                    <Badge variant="outline">Desconectado</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                {!session.isConnected && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleConnectSession(session.id)
                    }}
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
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Área de Chat */}
        <div className="md:col-span-2">
          {selectedSession?.isConnected ? (
            <Card>
              <CardHeader>
                <CardTitle>Chat - {selectedSession.name}</CardTitle>
                <CardDescription>Envie e receba mensagens</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  {messages.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center">Nenhuma mensagem</p>
                  )}
                  {messages.map((msg) => (
                    <div key={msg.id} className={`mb-3 flex ${msg.fromMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${msg.fromMe ? "bg-primary text-white" : "bg-muted"}`}
                      >
                        <p className="text-sm">{msg.body}</p>
                        <p className="text-xs mt-1 opacity-70">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </ScrollArea>

                <div className="space-y-2">
                  <Label>Número do destinatário (com código do país)</Label>
                  <Input
                    placeholder="Ex: 5511999999999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />

                  <Label>Mensagem</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[500px]">
                <p className="text-muted-foreground">
                  {selectedSession ? "Conecte esta instância para começar" : "Selecione uma instância"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog Criar Sessão */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Instância WhatsApp</DialogTitle>
            <DialogDescription>Escolha um nome para identificar esta conexão</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Ex: Vendas, Suporte..."
              />
            </div>
            <Button onClick={handleCreateSession} className="w-full">
              Criar e Conectar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog QR Code */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
            <DialogDescription>Abra o WhatsApp no celular e escaneie o código</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {qrCode ? (
              <img src={qrCode || "/placeholder.svg"} alt="QR Code" className="w-64 h-64" />
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
