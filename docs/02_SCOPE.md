# 02 — Escopo

## MVP (inclui)

### Funcionalidades
- Receber audio no Telegram (grupo) via **webhook**
- Transcrever audio (OpenAI Whisper)
- Interpretar intencao (OpenAI GPT):
  - Criar tarefa
  - Atualizar tarefa existente (status/urgencia/importancia/detalhes)
  - Concluir/arquivar tarefa
  - Listar pendencias (resumo curto)
- Classificar por Eisenhower: (Importante/Urgente) -> coluna do Kanban
- Criar/atualizar cards no Notion numa database especifica
- Idempotencia: nao duplicar tarefas se o mesmo audio for processado de novo
- Confirmacao no Telegram ("Criei X", "Atualizei Y")

### Infraestrutura Cloud
- **Backend em Vercel**: API serverless sempre disponivel
- **Banco de dados em Supabase**: Postgres gerenciado com RLS
- **Webhook do Telegram**: Recebe updates instantaneamente
- **Operacao 24/7**: Sistema autonomo, sem dependencia local

### Principio OpenAI-First
- TODA interpretacao semantica e feita pela OpenAI
- O backend apenas valida schema e executa acoes
- Nenhuma logica de NLP ou heuristica no codigo

## Fora do escopo (por agora)
- Multiusuario / multi-tenant
- Assinatura / billing
- Interface web propria
- Integracao com calendario
- Polling local (substituido por webhook)
- Banco de dados local (substituido por Supabase)
