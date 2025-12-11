"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Bot, Play, Pause, Edit, Trash2, Copy, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ChatbotFlow {
  _id: string
  name: string
  description: string
  isActive: boolean
  trigger: {
    type: string
  }
  stats: {
    totalExecutions: number
    totalCompletions: number
  }
}

export default function ChatbotsPage() {
  const router = useRouter()
  const [flows, setFlows] = useState<ChatbotFlow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFlows()
  }, [])

  const loadFlows = async () => {
    try {
      setError(null)
      const response = await apiClient.getChatbotFlows()
      setFlows(response.flows || [])
    } catch (error: any) {
      console.error("Failed to load flows:", error)
      setError("Falha ao carregar chatbots. Verifique sua conexão.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFlow = async (flowId: string, currentState: boolean) => {
    try {
      await apiClient.toggleChatbotFlow(flowId, !currentState)
      setFlows((prev) => prev.map((f) => (f._id === flowId ? { ...f, isActive: !currentState } : f)))
      toast.success(currentState ? "Chatbot pausado" : "Chatbot ativado")
    } catch (error) {
      toast.error("Erro ao atualizar chatbot")
    }
  }

  const deleteFlow = async (flowId: string) => {
    if (!confirm("Tem certeza que deseja excluir este chatbot?")) return

    try {
      await apiClient.deleteChatbotFlow(flowId)
      setFlows((prev) => prev.filter((f) => f._id !== flowId))
      toast.success("Chatbot excluído")
    } catch (error) {
      toast.error("Erro ao excluir chatbot")
    }
  }

  const duplicateFlow = async (flowId: string) => {
    try {
      const flow = flows.find((f) => f._id === flowId)
      if (!flow) return

      const response = await apiClient.createChatbotFlow({
        ...flow,
        name: `${flow.name} (Cópia)`,
        isActive: false,
      })

      setFlows((prev) => [response.flow, ...prev])
      toast.success("Chatbot duplicado")
    } catch (error) {
      toast.error("Erro ao duplicar chatbot")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando chatbots...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chatbots</h1>
          <p className="text-muted-foreground">Automatize seu atendimento com fluxos inteligentes</p>
        </div>

        <Button onClick={() => router.push("/chatbots/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Chatbot
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="link" onClick={loadFlows} className="ml-2">
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {flows.length === 0 && !error ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Nenhum chatbot criado</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Crie seu primeiro chatbot para automatizar respostas e qualificar leads automaticamente
            </p>
            <Button onClick={() => router.push("/chatbots/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Chatbot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <Card key={flow._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{flow.name}</CardTitle>
                  </div>
                  {flow.isActive ? (
                    <Badge className="bg-green-500">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>
                <CardDescription>{flow.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Gatilho: </span>
                    <span className="font-medium capitalize">{flow.trigger.type.replace("_", " ")}</span>
                  </div>

                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Execuções</p>
                      <p className="font-semibold">{flow.stats.totalExecutions}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Conclusões</p>
                      <p className="font-semibold">{flow.stats.totalCompletions}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => toggleFlow(flow._id, flow.isActive)}
                    >
                      {flow.isActive ? (
                        <>
                          <Pause className="h-3 w-3 mr-1" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/chatbots/${flow._id}`)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => duplicateFlow(flow._id)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteFlow(flow._id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Templates Prontos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Saudação Inicial</CardTitle>
              <CardDescription>Envie uma mensagem de boas-vindas para novos contatos</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                Usar Template
              </Button>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Qualificação de Lead</CardTitle>
              <CardDescription>Faça perguntas para qualificar automaticamente seus leads</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                Usar Template
              </Button>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">FAQ Automático</CardTitle>
              <CardDescription>Responda perguntas frequentes automaticamente</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                Usar Template
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
