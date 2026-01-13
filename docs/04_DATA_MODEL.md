# 04 — Modelo de Dados

## 4.1 Banco de Dados: Supabase (Postgres)

O sistema utiliza **Supabase** como banco de dados principal.
- Postgres gerenciado na nuvem
- Disponivel 24/7
- Row Level Security (RLS) habilitado
- Backups automaticos

### Conexao
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]
```

---

## 4.2 Tabela: events

Armazena todos os eventos processados (auditoria + idempotencia).

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL DEFAULT gen_random_uuid(),
    
    -- Dados do Telegram (idempotencia)
    chat_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    from_user_id TEXT,
    
    -- Dados do audio
    audio_file_id TEXT,
    audio_duration_sec INTEGER,
    
    -- Processamento
    transcription TEXT,
    parsed_intent JSONB,
    notion_action JSONB,
    
    -- Status do evento
    status TEXT NOT NULL DEFAULT 'received' 
        CHECK (status IN ('received', 'transcribed', 'parsed', 'synced', 'failed')),
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraint de idempotencia
    CONSTRAINT unique_chat_message UNIQUE (chat_id, message_id)
);

-- Indices para performance
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_trace_id ON events(trace_id);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

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
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

### Status do evento
- `received`: Webhook recebido, audio baixado
- `transcribed`: Audio transcrito pela OpenAI
- `parsed`: Intencao extraida pela OpenAI
- `synced`: Acao executada no Notion com sucesso
- `failed`: Erro em alguma etapa (ver error_message)

---

## 4.3 Tabela: tasks_map

Mapeia tarefas do Notion para facilitar updates e buscas.

```sql
CREATE TABLE tasks_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referencia ao Notion
    notion_page_id TEXT UNIQUE NOT NULL,
    task_title TEXT,
    last_seen_status TEXT,
    
    -- Referencia ao evento de criacao
    created_from_message_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indice para busca por titulo
CREATE INDEX idx_tasks_map_title ON tasks_map(task_title);

-- Trigger para updated_at
CREATE TRIGGER tasks_map_updated_at
    BEFORE UPDATE ON tasks_map
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

---

## 4.4 Row Level Security (RLS)

Para seguranca adicional, habilitar RLS nas tabelas:

```sql
-- Habilitar RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_map ENABLE ROW LEVEL SECURITY;

-- Politica: apenas service_role pode acessar
CREATE POLICY "Service role full access on events"
    ON events FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on tasks_map"
    ON tasks_map FOR ALL
    USING (auth.role() = 'service_role');
```

**Nota**: O backend usa `SUPABASE_SERVICE_ROLE_KEY` para bypass do RLS.

---

## 4.5 Campos no Notion (Database/Kanban)

> IMPORTANTE: os nomes abaixo sao canonicos. Se voce quiser outros, altere aqui ANTES de codar.

Database: "Tasks — AI Secretary"

Propriedades:
- Name (title)                      -> titulo da tarefa
- Status (select)                   -> coluna do Kanban
- Eisenhower (select)               -> Do | Decide | Delegate | Delete
- Importance (select)               -> High | Medium | Low
- Urgency (select)                  -> High | Medium | Low
- Due (date)                        -> prazo (opcional)
- Notes (rich_text)                 -> descricao livre
- Source (rich_text)                -> "telegram:chat_id:message_id"
- Confidence (number)               -> 0-100 (confianca do parser)
- Tags (multi_select)               -> ex: Financeiro, Familia, Trabalho
- Effort (select)                   -> S | M | L (opcional)

---

## 4.6 Mapeamento Eisenhower -> Status (Kanban)

- Do        -> "DO (Agora)"
- Decide    -> "DECIDE (Agendar)"
- Delegate  -> "DELEGATE (Delegar)"
- Delete    -> "DELETE (Eliminar)"
- Done      -> "DONE"
