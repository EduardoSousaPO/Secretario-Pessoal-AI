# 10 — Runbook (Operacao)

## Arquitetura Cloud-First

O sistema opera 100% na nuvem, 24/7, sem dependencia de computador local.

```
Telegram --> Vercel (webhook) --> Supabase + OpenAI + Notion
```

---

## 1) Pre-requisitos

### Contas necessarias
- [Telegram](https://telegram.org) - para criar o bot
- [Vercel](https://vercel.com) - para hospedar o backend
- [Supabase](https://supabase.com) - para o banco de dados
- [OpenAI](https://platform.openai.com) - para transcricao e interpretacao
- [Notion](https://notion.so) - para o Kanban

---

## 2) Setup do Telegram Bot

### Criar bot
1. Abrir @BotFather no Telegram
2. Enviar /newbot
3. Escolher nome e username
4. Salvar o token: `TELEGRAM_BOT_TOKEN`

### Adicionar ao grupo
1. Criar grupo no Telegram (ou usar existente)
2. Adicionar o bot ao grupo
3. Obter chat_id (enviar mensagem e verificar via API)

---

## 3) Setup do Supabase

### Criar projeto
1. Acessar https://supabase.com
2. Criar novo projeto
3. Salvar credenciais:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Criar tabelas
Executar no SQL Editor do Supabase:

```sql
-- Tabela events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL DEFAULT gen_random_uuid(),
    chat_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    from_user_id TEXT,
    audio_file_id TEXT,
    audio_duration_sec INTEGER,
    transcription TEXT,
    parsed_intent JSONB,
    notion_action JSONB,
    status TEXT NOT NULL DEFAULT 'received' 
        CHECK (status IN ('received', 'transcribed', 'parsed', 'synced', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_chat_message UNIQUE (chat_id, message_id)
);

-- Tabela tasks_map
CREATE TABLE tasks_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notion_page_id TEXT UNIQUE NOT NULL,
    task_title TEXT,
    last_seen_status TEXT,
    created_from_message_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_trace_id ON events(trace_id);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_tasks_map_title ON tasks_map(task_title);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_map_updated_at
    BEFORE UPDATE ON tasks_map
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access" ON events FOR ALL
    USING (auth.role() = 'service_role');
CREATE POLICY "Service role access" ON tasks_map FOR ALL
    USING (auth.role() = 'service_role');
```

---

## 4) Setup do Notion

### Criar Integration
1. Acessar https://www.notion.so/my-integrations
2. Criar nova integration
3. Salvar token: `NOTION_TOKEN`

### Criar Database
1. Criar nova database no Notion
2. Adicionar propriedades conforme docs/04_DATA_MODEL.md:
   - Name (title)
   - Status (select): DO (Agora), DECIDE (Agendar), DELEGATE (Delegar), DELETE (Eliminar), DONE
   - Eisenhower (select): Do, Decide, Delegate, Delete
   - Importance (select): High, Medium, Low
   - Urgency (select): High, Medium, Low
   - Due (date)
   - Notes (rich_text)
   - Source (rich_text)
   - Confidence (number)
   - Tags (multi_select)
   - Effort (select): S, M, L

3. Compartilhar database com a integration
4. Copiar Database ID da URL: `NOTION_DATABASE_ID`

---

## 5) Setup da OpenAI

1. Acessar https://platform.openai.com
2. Criar API Key
3. Salvar: `OPENAI_API_KEY`

---

## 6) Deploy na Vercel

### Conectar repositorio
1. Acessar https://vercel.com
2. Importar projeto do GitHub
3. Configurar framework (Next.js ou similar)

### Configurar variaveis de ambiente
Em Settings > Environment Variables:

```
TELEGRAM_BOT_TOKEN=seu_token
TELEGRAM_ALLOWED_USERS=123456,789012
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key
OPENAI_API_KEY=sk-xxx
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=xxx
```

### Deploy
1. Push para branch main
2. Vercel faz deploy automatico
3. Obter URL do projeto: `https://[projeto].vercel.app`

---

## 7) Configurar Webhook do Telegram

Apos o deploy, configurar o webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://[projeto].vercel.app/api/telegram/webhook"}'
```

Verificar configuracao:
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

---

## 8) Operacao

### Monitoramento
- **Vercel Dashboard**: logs de execucao, erros, metricas
- **Supabase Dashboard**: dados, queries, logs

### Verificar eventos
```sql
-- Ultimos eventos
SELECT * FROM events ORDER BY created_at DESC LIMIT 10;

-- Eventos com falha
SELECT * FROM events WHERE status = 'failed';

-- Estatisticas
SELECT status, COUNT(*) FROM events GROUP BY status;
```

### Retry de eventos com falha
1. Identificar eventos com status = 'failed'
2. Analisar error_message
3. Corrigir problema (se aplicavel)
4. Reprocessar manualmente ou aguardar nova mensagem

---

## 9) Troubleshooting

### Webhook nao recebe mensagens
1. Verificar getWebhookInfo
2. Verificar se URL esta correta
3. Verificar logs na Vercel

### Erro de transcricao
1. Verificar OPENAI_API_KEY
2. Verificar se audio e valido
3. Verificar logs no Supabase

### Erro no Notion
1. Verificar NOTION_TOKEN
2. Verificar se database foi compartilhada
3. Verificar propriedades da database

### Eventos duplicados
- Constraint UNIQUE impede duplicacao
- Se ocorrer erro de constraint, e esperado (idempotencia)

---

## 10) Atualizacoes

### Deploy de novas versoes
1. Push para branch main
2. Vercel faz deploy automatico
3. Zero downtime

### Alteracoes no banco
1. Executar migrations no SQL Editor do Supabase
2. Testar em ambiente de staging primeiro
3. Aplicar em producao

---

## Checklist de Verificacao

- [ ] Bot criado no Telegram
- [ ] Projeto criado no Supabase
- [ ] Tabelas criadas no Supabase
- [ ] RLS habilitado
- [ ] Database criada no Notion
- [ ] Integration compartilhada com database
- [ ] API Key da OpenAI criada
- [ ] Projeto deployado na Vercel
- [ ] Variaveis de ambiente configuradas
- [ ] Webhook do Telegram configurado
- [ ] Teste: enviar audio e verificar tarefa criada
