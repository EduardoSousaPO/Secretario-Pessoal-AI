# 06 — Workflows (fim-a-fim)

## Arquitetura Cloud

Todos os fluxos sao executados automaticamente na nuvem:
- **Trigger**: Webhook do Telegram (Vercel)
- **Persistencia**: Supabase (Postgres)
- **Inteligencia**: OpenAI (cerebro unico)
- **Destino**: Notion (Kanban)

O sistema opera 24/7 sem intervencao manual.

---

## 6.1 Fluxo: criar tarefa

```
Telegram ──webhook──▶ Vercel ──▶ Supabase (evento)
                        │
                        ▼
                      OpenAI (transcricao)
                        │
                        ▼
                      OpenAI (interpretacao)
                        │
                        ▼
                      Notion (criar card)
                        │
                        ▼
                      Telegram (confirmacao)
```

### Passos detalhados:
1) Webhook recebe audio do Telegram
2) Verifica idempotencia no Supabase (chat_id, message_id)
3) Se ja existe: ignora (retorna 200 OK)
4) Cria evento no Supabase com status "received"
5) Baixa arquivo de audio via API do Telegram
6) Transcreve com OpenAI Whisper
7) Atualiza evento no Supabase com status "transcribed"
8) Envia transcricao para OpenAI interpretar (GPT)
9) Atualiza evento no Supabase com status "parsed"
10) **Se confidence < 60**: pede reformulacao, status "synced" com action=noop
11) Classifica Eisenhower (mapeamento deterministico)
12) Cria card no Notion com propriedades canonicas
13) Atualiza evento no Supabase com status "synced"
14) Responde no Telegram com confirmacao

---

## 6.2 Fluxo: atualizar tarefa

1) Webhook recebe audio
2) OpenAI interpreta: intent=update_task
3) Resolve a tarefa alvo:
   - se task_id explicito: busca no tasks_map do Supabase
   - senao: query no Notion por titulo semelhante + status != DONE
4) Atualiza propriedades no Notion
5) Atualiza tasks_map no Supabase
6) Responde no Telegram ("Atualizei X: Status -> Y")

---

## 6.3 Fluxo: concluir tarefa

1) Webhook recebe audio
2) OpenAI interpreta: intent=complete_task
3) Localiza tarefa alvo (mesmo processo do update)
4) Atualiza Status -> "DONE" no Notion
5) Responde confirmacao no Telegram

---

## 6.4 Fluxo: listagem

1) Webhook recebe audio
2) OpenAI interpreta: intent=list_tasks
3) Query no Notion por Status != DONE
4) Ordena por urgencia/importancia/due
5) Envia resumo curto no Telegram (top 5)

---

## 6.5 Schema do JSON de intencao (canonico)

A OpenAI DEVE retornar exatamente este schema:

```json
{
  "intent": "create_task|update_task|complete_task|list_tasks|noop",
  "confidence": 0-100,
  "task_ref": {
    "notion_page_id": "string|null",
    "title_guess": "string|null"
  },
  "fields": {
    "title": "string|null",
    "notes": "string|null",
    "importance": "High|Medium|Low|null",
    "urgency": "High|Medium|Low|null",
    "due_date": "YYYY-MM-DD|null",
    "tags": ["string"],
    "effort": "S|M|L|null",
    "status": "DO (Agora)|DECIDE (Agendar)|DELEGATE (Delegar)|DELETE (Eliminar)|DONE|null"
  }
}
```

### Validacao no backend
O backend APENAS valida:
- JSON e valido
- Campos obrigatorios existem
- Valores estao dentro dos permitidos (enums)

O backend NAO interpreta ou modifica o conteudo semantico.

---

## 6.6 Regras de interpretacao por voz (comandos comuns)

Estas regras sao implementadas no prompt da OpenAI, NAO no backend:

- "criar tarefa X" => create_task
- "nova tarefa" => create_task
- "atualizar tarefa X para..." => update_task
- "marcar tarefa X como concluida" => complete_task
- "minhas tarefas / pendencias" => list_tasks

---

## 6.7 Tratamento de erros

### Erro na OpenAI
- Registrar no Supabase com status "failed"
- Responder no Telegram: "Erro ao processar audio. Tente novamente."

### Erro no Notion
- Registrar no Supabase com status "failed"
- Responder no Telegram: "Erro ao salvar tarefa. Tente novamente."
- Permitir retry via query no Supabase

### Confidence baixa (< 60)
- NAO executar acao no Notion
- Registrar no Supabase com action=noop
- Responder no Telegram pedindo reformulacao
