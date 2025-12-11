# Guia de Correção do CORS

## Problema Resolvido

O erro de CORS acontecia porque o backend na Railway não estava permitindo requisições do frontend na Vercel.

## O Que Foi Corrigido

### Backend (server/index.js)

Atualizei a configuração do CORS para aceitar múltiplas origens:

\`\`\`javascript
cors({
  origin: [
    "http://localhost:3000",              // Desenvolvimento local
    "https://eeeeeeee-eight.vercel.app",  // Produção na Vercel
    process.env.FRONTEND_URL,             // Variável de ambiente customizada
  ].filter(Boolean),
  credentials: true,
})
\`\`\`

## Configuração na Railway

### Variáveis de Ambiente Necessárias

Na Railway, adicione estas variáveis:

1. **FRONTEND_URL** (opcional): `https://eeeeeeee-eight.vercel.app`
2. **SUPABASE_URL**: Sua URL do Supabase
3. **SUPABASE_ANON_KEY**: Sua chave anônima do Supabase
4. **SUPABASE_SERVICE_ROLE_KEY**: Sua service role key do Supabase

### Como Adicionar

1. Acesse o projeto na Railway
2. Vá em **Variables**
3. Adicione as variáveis acima
4. Faça **Redeploy** do serviço

## Configuração na Vercel

### Variáveis de Ambiente Necessárias

Na Vercel, adicione estas variáveis:

1. **NEXT_PUBLIC_API_URL**: `https://eeeeeeee-production.up.railway.app`
2. **NEXT_PUBLIC_WS_URL**: `https://eeeeeeee-production.up.railway.app`
3. **NEXT_PUBLIC_SUPABASE_URL**: Sua URL do Supabase
4. **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Sua chave anônima do Supabase

### Como Adicionar

1. Acesse o projeto na Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione as variáveis acima
4. Faça **Redeploy** do projeto

## Testando a Correção

Após configurar e fazer redeploy:

1. Abra o console do navegador (F12)
2. Tente criar uma nova sessão WhatsApp
3. Não deve mais aparecer erros de CORS
4. As requisições devem funcionar normalmente

## Solução de Problemas

### Ainda aparece erro de CORS?

1. Verifique se as variáveis de ambiente foram salvas corretamente
2. Certifique-se de ter feito redeploy após adicionar as variáveis
3. Limpe o cache do navegador
4. Tente em uma aba anônima

### WebSocket não conecta?

1. Verifique se a URL do Railway está correta
2. Certifique-se de que o backend está rodando
3. Verifique os logs na Railway para ver se há erros

### Erro de autenticação?

1. Verifique se o token JWT está sendo enviado corretamente
2. Veja no console do navegador se `authToken` está presente
3. Verifique se as credenciais do Supabase estão corretas

## Verificação Final

Execute estes testes:

✅ Frontend carrega sem erros de CORS
✅ Pode criar uma nova sessão WhatsApp
✅ WebSocket conecta com sucesso
✅ QR Code é exibido
✅ Mensagens são enviadas e recebidas

## Segurança

O sistema agora está com:

- ✅ CORS configurado corretamente
- ✅ Autenticação JWT via Supabase
- ✅ RLS habilitado no banco de dados
- ✅ Isolamento de dados por usuário
- ✅ Conexões seguras HTTPS/WSS

Tudo pronto para usar em produção! 🚀
