# 05 — Integracoes (contratos)

## Arquitetura de Integracoes

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Telegram   │────▶│   Vercel    │────▶│  Supabase   │
│  (usuario)  │     │  (backend)  │     │  (Postgres) │
└─────────────┘     └──────┬──────┘     └─────────────┘
     ▲                     │
     │              ┌──────▼──────┐
     │              │   OpenAI    │
     │              │  (cerebro)  │
     │              └──────┬──────┘
     │                     │
     │              ┌──────▼──────┐
     └──────────────│   Notion    │
      confirmacao   │  (Kanban)   │
                    └─────────────┘
```

---

## 5.1 Telegram (Webhook)

### Configuracao
- Bot criado via BotFather
- **Webhook** configurado para URL publica da Vercel
- NAO usar polling (getUpdates)

### Endpoint do Webhook
```
POST https://[seu-projeto].vercel.app/api/telegram/webhook
```

### Configurar Webhook
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://[seu-projeto].vercel.app/api/telegram/webhook"}'
```

### Payload recebido (voice message)
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 123,
    "from": {"id": 123456, "first_name": "Usuario"},
    "chat": {"id": -100123456789, "type": "group"},
    "date": 1234567890,
    "voice": {
      "file_id": "AwACAgEAAxkBAAI...",
      "duration": 5
    }
  }
}
```

### Dados extraidos
- chat_id
- message_id
- from_user_id
- voice.file_id
- voice.duration
- date (timestamp)

### Download do audio
1. GET `https://api.telegram.org/bot<TOKEN>/getFile?file_id=<FILE_ID>`
2. Baixar de `https://api.telegram.org/file/bot<TOKEN>/<file_path>`

### Resposta ao usuario
- POST `https://api.telegram.org/bot<TOKEN>/sendMessage`

---

## 5.2 Supabase (Banco de Dados)

### Conexao
O backend usa o cliente Supabase com `SUPABASE_SERVICE_ROLE_KEY` para bypass do RLS.

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```

### Operacoes

#### Verificar idempotencia
```sql
SELECT id FROM events 
WHERE chat_id = $1 AND message_id = $2
```

#### Criar evento
```sql
INSERT INTO events (chat_id, message_id, from_user_id, audio_file_id, audio_duration_sec, status)
VALUES ($1, $2, $3, $4, $5, 'received')
RETURNING id, trace_id
```

#### Atualizar evento
```sql
UPDATE events 
SET transcription = $1, parsed_intent = $2, notion_action = $3, status = $4, error_message = $5
WHERE id = $6
```

#### Buscar eventos com falha (para retry)
```sql
SELECT * FROM events WHERE status = 'failed' ORDER BY created_at DESC
```

---

## 5.3 OpenAI (Cerebro Unico)

### Principio OpenAI-First
- **TODA** interpretacao semantica e responsabilidade da OpenAI
- O backend NAO implementa logica de NLP ou heuristicas
- O backend apenas valida o schema JSON retornado

### Transcricao (Whisper)
```
POST https://api.openai.com/v1/audio/transcriptions
Content-Type: multipart/form-data

model: whisper-1
file: <audio_file>
language: pt
```

### Interpretacao (GPT)
```
POST https://api.openai.com/v1/chat/completions
Content-Type: application/json

{
  "model": "gpt-4o-mini",
  "temperature": 0.1,
  "response_format": {"type": "json_object"},
  "messages": [
    {"role": "system", "content": "<SYSTEM_PROMPT>"},
    {"role": "user", "content": "<TRANSCRICAO>"}
  ]
}
```

### Schema de resposta (canonico)
Ver docs/06_WORKFLOWS.md secao 6.5

### Regra de confianca
- Se `confidence < 60`: NAO executar acao no Notion
- Pedir reformulacao ao usuario

---

## 5.4 Notion (Kanban)

### Configuracao
- Database ID em variavel de ambiente
- Integration token com acesso a database

### Operacoes

#### Criar tarefa
```
POST https://api.notion.com/v1/pages
Authorization: Bearer <NOTION_TOKEN>
Notion-Version: 2022-06-28
```

#### Atualizar tarefa
```
PATCH https://api.notion.com/v1/pages/<page_id>
```

#### Buscar tarefas
```
POST https://api.notion.com/v1/databases/<database_id>/query
```

### Propriedades (canonicas)
Ver docs/04_DATA_MODEL.md secao 4.5

---

## 5.5 Variaveis de Ambiente (Vercel)

```env
# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USERS=123456,789012

# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Notion
NOTION_TOKEN=
NOTION_DATABASE_ID=
```

Configurar em: Vercel Dashboard > Project > Settings > Environment Variables
