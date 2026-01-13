# 03 — Requisitos

## 3.1 Funcionais (RF)

### RF-01 — Ingestao de audio (Telegram via Webhook)
- O sistema deve receber mensagens de voz via webhook do Telegram (nao polling).
- O webhook e hospedado na Vercel e recebe updates instantaneamente.
- Deve suportar audio/voice nativo do Telegram.
- O sistema opera 24/7 automaticamente.

### RF-02 — Transcricao
- Deve transcrever o audio para texto usando a API da OpenAI (modelo Whisper).
- Deve armazenar transcricao e metadados no Supabase (message_id, chat_id, user_id, timestamp).

### RF-03 — Interpretacao de intencao (OpenAI-First)
A partir da transcricao, a OpenAI deve extrair:
- intent: create_task | update_task | complete_task | list_tasks | noop
- task_ref: (opcional) identificador ou titulo aproximado da tarefa alvo
- fields: titulo, descricao, tags, prazo, importancia, urgencia, esforco estimado
- eisenhower: do | decide | delegate | delete (quando aplicavel)
- confidence: 0-100 (nivel de certeza da interpretacao)

REGRA CRITICA: O backend NAO implementa logica de NLP. Toda interpretacao e delegada a OpenAI.

### RF-04 — Matriz Eisenhower -> Kanban
- O sistema deve mapear Eisenhower para colunas/status do Notion (definidos em docs/04_DATA_MODEL.md).
- O mapeamento e deterministico (nao requer interpretacao).

### RF-05 — Criacao de tarefa no Notion
- Ao criar, deve preencher campos minimos e registrar source (telegram message id).
- Deve retornar confirmacao no Telegram.

### RF-06 — Atualizacao de tarefa no Notion
- Deve localizar a tarefa alvo por:
  1) task_id explicito (se existir),
  2) match por titulo aproximado + status aberto,
  3) fallback: pedir confirmacao (MVP: escolher a melhor e avisar ambiguidade).
- Atualizar status, descricao, prioridade e demais campos reconhecidos.
- Confirmar no Telegram.

### RF-07 — Conclusao/arquivamento
- Deve mover a tarefa para Done/Arquivado no Notion (status definido no Data Model).
- Confirmar no Telegram.

### RF-08 — Listagem/resumo
- Quando o usuario pedir minhas tarefas de hoje/pendencias, o sistema deve retornar um resumo curto no Telegram:
  - top 5 por urgencia/importancia
  - agrupadas por coluna do Kanban

### RF-09 — Auditoria e rastreio
- Todo evento deve gerar log persistido no Supabase com:
  - transcription, intent, entidades extraidas, acao no Notion, resultado, erro (se houver)
- Logs acessiveis via Supabase Dashboard ou queries SQL.

## 3.2 Nao funcionais (RNF)

### RNF-01 — Idempotencia
- Reprocessar a mesma mensagem do Telegram nao deve duplicar tarefas.
- A chave de idempotencia e: (chat_id, message_id).
- Constraint UNIQUE no Supabase garante isso a nivel de banco.

### RNF-02 — Resiliencia
- Se Notion estiver fora, registrar o evento como failed no Supabase.
- Permitir retry via query no Supabase (SELECT * FROM events WHERE status = 'failed').

### RNF-03 — Seguranca
- Tokens e chaves em variaveis de ambiente da Vercel (nunca hardcode).
- Supabase com Row Level Security (RLS) habilitado.
- Minimizar dados sensiveis no Notion (ver docs/08_SECURITY_PRIVACY.md).

### RNF-04 — Observabilidade
- Logs estruturados (JSON) com trace_id por mensagem.
- Logs disponiveis no Vercel Dashboard e Supabase.

### RNF-05 — Disponibilidade (24/7)
- O sistema deve operar continuamente sem intervencao manual.
- Backend na Vercel: serverless, escala automaticamente.
- Banco no Supabase: gerenciado, backups automaticos.
- Nenhuma dependencia de computador local do usuario.

## 3.3 Criterios de aceite (exemplos)
- Enviar audio: Criar tarefa: pagar IPVA amanha, importante e urgente
  => cria card no Notion em coluna DO, com due date amanha, confirma no Telegram.
  => evento registrado no Supabase com status synced.
- Enviar audio: A tarefa pagar IPVA pode ir pra concluido
  => move card para Done.
  => funciona a qualquer hora do dia, mesmo de madrugada.
