# Checklist Final - Resolução CORS

## ✅ Passo a Passo

### 1. Railway - Adicionar Variável
- [ ] Abri Railway: https://railway.app
- [ ] Entrei no projeto `eeeeeeee`
- [ ] Cliquei no serviço backend
- [ ] Fui na aba **Variables**
- [ ] Cliquei em **New Variable**
- [ ] Adicionei: `FRONTEND_URL=https://eeeeeeee-eight.vercel.app`
- [ ] Cliquei em **Add**
- [ ] Aguardei o deploy (ver status "✓ Deployed")

### 2. Teste no Frontend
- [ ] Abri https://eeeeeeee-eight.vercel.app
- [ ] Abri DevTools (F12) → Console
- [ ] Cliquei em "Nova" para criar sessão
- [ ] Digitei um nome
- [ ] Cliquei em "Criar Sessão"
- [ ] **Resultado esperado**: Sem erro de CORS!

---

## 🚨 Se Ainda Tiver Erro

### Erro de CORS persiste?
1. Verifique se a variável `FRONTEND_URL` realmente foi adicionada na Railway
2. Verifique se o deploy terminou (não deve estar "Building")
3. Limpe o cache do navegador (Ctrl+Shift+R)
4. Tente novamente

### WebSocket não conecta?
- Isso é normal se o backend estiver em "cold start"
- Aguarde 10-15 segundos e tente novamente
- Railway pode colocar o serviço em "sleep" se não tiver requisições

### Erro 500 no backend?
- Verifique os logs da Railway: Deploy Logs
- Procure por erros relacionados ao Supabase
- Confirme que todas as variáveis do Supabase estão corretas

---

## 📝 Variáveis Necessárias na Railway

Confirme que TODAS essas variáveis existem:

\`\`\`
SUPABASE_URL=https://ldieqcofmincppqzownw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...
FRONTEND_URL=https://eeeeeeee-eight.vercel.app
PORT=3001
NODE_ENV=production
\`\`\`

Se alguma estiver faltando, adicione!
