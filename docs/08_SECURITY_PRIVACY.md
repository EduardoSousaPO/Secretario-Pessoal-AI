# 08 — Seguranca e Privacidade

## Ambiente Cloud (Vercel + Supabase)

O sistema opera 100% na nuvem com as seguintes medidas de seguranca.

---

## 1) Variaveis de Ambiente

### Vercel
Todas as chaves e tokens sao armazenadas como Environment Variables na Vercel:
- TELEGRAM_BOT_TOKEN
- TELEGRAM_ALLOWED_USERS
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY
- NOTION_TOKEN
- NOTION_DATABASE_ID

Configurar em: Vercel Dashboard > Project > Settings > Environment Variables

### Regras
- NUNCA fazer hardcode de tokens no codigo
- NUNCA commitar .env no repositorio
- Usar .env.example apenas com placeholders

---

## 2) Supabase - Row Level Security (RLS)

### Configuracao
```sql
-- Habilitar RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_map ENABLE ROW LEVEL SECURITY;

-- Apenas service_role pode acessar
CREATE POLICY "Service role full access on events"
    ON events FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on tasks_map"
    ON tasks_map FOR ALL
    USING (auth.role() = 'service_role');
```

### Chaves
- **SUPABASE_ANON_KEY**: Acesso publico limitado (nao usar no backend)
- **SUPABASE_SERVICE_ROLE_KEY**: Acesso total, bypass RLS (usar no backend)

---

## 3) Allowlist de Usuarios

### Configuracao
```env
TELEGRAM_ALLOWED_USERS=123456,789012
```

### Comportamento
- Se a lista estiver vazia: aceita todos (apenas para desenvolvimento)
- Se a lista tiver IDs: so processa mensagens desses usuarios
- Usuarios nao autorizados sao ignorados silenciosamente

---

## 4) Dados Sensiveis

### Notion
- Evitar colocar dados sensiveis (CPF, senhas, dados bancarios)
- O Notion e acessivel via link compartilhado
- Usar apenas para gestao de tarefas

### Supabase
- Transcricoes de audio sao armazenadas
- Contem o que o usuario falou
- Acesso restrito via RLS

### Logs
- Logs no Vercel podem conter transcricoes
- Logs no Supabase contem eventos completos
- Nao imprimir tokens ou headers sensiveis

---

## 5) Audio

### Armazenamento
- Audio e baixado temporariamente durante o processamento
- Funcoes serverless nao persistem arquivos entre execucoes
- Audio nao e armazenado permanentemente

### Transmissao
- Download via HTTPS (API do Telegram)
- Upload para OpenAI via HTTPS
- Conexoes criptografadas

---

## 6) Webhook do Telegram

### Validacao
- Telegram envia updates apenas para a URL configurada
- URL deve ser HTTPS (Vercel fornece automaticamente)
- Considerar validar secret_token (opcional)

### Configuracao segura
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://[projeto].vercel.app/api/telegram/webhook",
    "secret_token": "seu_secret_opcional"
  }'
```

---

## 7) Boas Praticas

1. **Principio do menor privilegio**: cada servico tem apenas as permissoes necessarias
2. **Rotacao de chaves**: trocar tokens periodicamente
3. **Monitoramento**: verificar logs regularmente
4. **Backups**: Supabase faz backups automaticos
5. **Atualizacoes**: manter dependencias atualizadas
