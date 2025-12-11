"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, MoreHorizontal, MessageSquare } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { socketClient } from "@/lib/socket-client" // Import socketClient

interface Contact {
  _id: string
  name: string
  phoneNumber: string
  avatar?: string
  pipelineStage: string
  tags: string[]
  lastInteraction?: string
  totalMessages: number
}

const stages = [
  { id: "new", label: "Novo", color: "bg-blue-500" },
  { id: "contacted", label: "Contatado", color: "bg-purple-500" },
  { id: "qualified", label: "Qualificado", color: "bg-yellow-500" },
  { id: "proposal", label: "Proposta", color: "bg-orange-500" },
  { id: "negotiation", label: "Negociação", color: "bg-pink-500" },
  { id: "won", label: "Ganho", color: "bg-green-500" },
  { id: "lost", label: "Perdido", color: "bg-red-500" },
]

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedContact, setDraggedContact] = useState<Contact | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadContacts = async () => {
    try {
      setError(null)
      const data = await apiClient.getContacts({ limit: 500 })
      setContacts(data.contacts)
    } catch (error) {
      console.error("Failed to load contacts:", error)
      setError("Falha ao carregar contatos. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadContacts()

    const socket = socketClient.getSocket()
    if (socket) {
      socket.on("contact:updated", (updatedContact: Contact) => {
        console.log("[v0] Contact updated:", updatedContact._id)
        setContacts((prev) => prev.map((c) => (c._id === updatedContact._id ? updatedContact : c)))
      })

      socket.on("contact:created", (newContact: Contact) => {
        console.log("[v0] New contact created:", newContact._id)
        setContacts((prev) => [newContact, ...prev])
      })

      return () => {
        socket.off("contact:updated")
        socket.off("contact:created")
      }
    }
  }, [])

  const getContactsByStage = (stageId: string) => {
    return contacts.filter((c) => c.pipelineStage === stageId)
  }

  const handleDragStart = (e: React.DragEvent, contact: Contact) => {
    setDraggedContact(contact)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault()

    if (!draggedContact || draggedContact.pipelineStage === newStage) {
      setDraggedContact(null)
      return
    }

    const previousStage = draggedContact.pipelineStage
    setContacts((prev) => prev.map((c) => (c._id === draggedContact._id ? { ...c, pipelineStage: newStage } : c)))

    try {
      await apiClient.updateContact(draggedContact._id, {
        pipelineStage: newStage,
      })
      await loadContacts()
    } catch (error) {
      console.error("Failed to update contact stage:", error)
      alert("Erro ao atualizar etapa do contato")
      setContacts((prev) =>
        prev.map((c) => (c._id === draggedContact._id ? { ...c, pipelineStage: previousStage } : c)),
      )
    } finally {
      setDraggedContact(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando pipeline...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <CardTitle className="text-base">Erro</CardTitle>
              </div>
              <Badge variant="secondary">{0}</Badge>
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-24rem)]">
            <CardContent className="space-y-3">
              <div className="text-center text-muted-foreground text-sm py-8">
                {error}
                <Button variant="link" onClick={loadContacts} className="ml-2">
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">Gerencie seus leads através do funil de vendas</p>
        </div>

        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Negociação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getContactsByStage("negotiation").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganhos (mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{getContactsByStage("won").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.length > 0 ? Math.round((getContactsByStage("won").length / contacts.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageContacts = getContactsByStage(stage.id)

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <CardTitle className="text-base">{stage.label}</CardTitle>
                    </div>
                    <Badge variant="secondary">{stageContacts.length}</Badge>
                  </div>
                </CardHeader>

                <ScrollArea className="h-[calc(100vh-24rem)]">
                  <CardContent className="space-y-3">
                    {stageContacts.map((contact) => (
                      <Card
                        key={contact._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, contact)}
                        className={`
                          cursor-move hover:shadow-md transition-shadow
                          ${draggedContact?._id === contact._id ? "opacity-50" : ""}
                        `}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                              <AvatarFallback>{contact.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <h4 className="font-medium text-sm truncate">{contact.name}</h4>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </div>

                              <p className="text-xs text-muted-foreground mb-2">{contact.phoneNumber}</p>

                              {contact.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {contact.tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{contact.totalMessages}</span>
                                </div>

                                {contact.lastInteraction && (
                                  <span>
                                    {formatDistanceToNow(new Date(contact.lastInteraction), {
                                      locale: ptBR,
                                      addSuffix: true,
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {stageContacts.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">Nenhum lead nesta etapa</div>
                    )}
                  </CardContent>
                </ScrollArea>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
