import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, PhoneCall, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/login")
  }

  const { data: userProfile } = await supabase.from("users").select("*, tenants(*)").eq("id", user.id).single()

  const sessionsResult = await supabase.from("whatsapp_sessions").select("*").eq("user_id", user.id)

  const stats = {
    activeSessions: sessionsResult.data?.filter((s) => s.status === "connected").length || 0,
    totalSessions: sessionsResult.data?.length || 0,
  }

  const statsCards = [
    {
      title: "Sessões WhatsApp",
      value: stats.totalSessions,
      icon: PhoneCall,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Sessões Conectadas",
      value: stats.activeSessions,
      icon: CheckCircle2,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Bem-vindo, {userProfile?.full_name || user.email}</p>
        </div>
        <Badge variant="default" className="gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          {(userProfile as any)?.tenants?.plan || "Free"}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {statsCards.map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Como Começar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Conecte uma Instância WhatsApp</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Crie uma nova instância e escaneie o QR code com seu celular
                </p>
                <Link href="/whatsapp">
                  <Button size="sm">
                    <PhoneCall className="w-4 h-4 mr-2" />
                    Ir para WhatsApp
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Envie e Receba Mensagens</h3>
                <p className="text-sm text-muted-foreground">
                  Após conectar, você pode enviar mensagens direto pela plataforma
                </p>
              </div>
            </div>

            {stats.activeSessions === 0 && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ Você ainda não tem nenhuma sessão WhatsApp conectada. Comece criando uma instância!
                </p>
              </div>
            )}

            {stats.activeSessions > 0 && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ Você tem {stats.activeSessions} sessão(ões) WhatsApp conectada(s)!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
