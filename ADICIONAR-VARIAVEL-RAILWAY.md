# Como Adicionar a Variável FRONTEND_URL na Railway

## O Problema
Seu backend está rodando mas bloqueando requisições porque falta a variável `FRONTEND_URL`.

## A Solução (2 minutos)

### Passo 1: Abra a Railway
1. Vá em https://railway.app
2. Entre no projeto `eeeeeeee`
3. Clique no serviço do backend

### Passo 2: Adicione a Variável
1. Clique na aba **"Variables"**
2. Clique em **"New Variable"**
3. Cole exatamente isso:

\`\`\`
FRONTEND_URL=https://eeeeeeee-eight.vercel.app
\`\`\`

4. Clique em **"Add"**

### Passo 3: Aguarde o Deploy
- A Railway fará redeploy automático (30-60 segundos)
- Aguarde até ver "✓ Deployed"

### Passo 4: Teste
1. Volte para `https://eeeeeeee-eight.vercel.app`
2. Abra o DevTools (F12)
3. Tente criar uma sessão
4. **Não deve mais ter erro de CORS!**

---

## Verificação Rápida

Se ainda tiver erro, verifique:

1. **A variável foi adicionada?**
   - Railway → Variables → Deve aparecer `FRONTEND_URL`

2. **O deploy terminou?**
   - Railway → Deployments → Status "✓ Deployed"

3. **A URL está correta?**
   - Deve ser: `https://eeeeeeee-eight.vercel.app` (SEM barra no final)

---

## Por Que Isso Resolve?

O backend já está configurado para aceitar requisições de:
- `http://localhost:3000` (desenvolvimento local)
- `https://eeeeeeee-eight.vercel.app` (hardcoded)
- `process.env.FRONTEND_URL` (variável de ambiente)

Como `process.env.FRONTEND_URL` está undefined, o CORS está falhando.

Após adicionar a variável, o backend permitirá requisições do frontend Vercel.
