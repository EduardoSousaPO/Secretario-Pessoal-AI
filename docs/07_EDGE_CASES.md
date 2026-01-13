# 07 — Casos de borda

## Ambiente Cloud (Vercel + Supabase)

Todos os casos de borda sao tratados no ambiente cloud.
O sistema opera 24/7 sem intervencao manual.

---

## 1) Audio sem tarefa clara
- OpenAI retorna intent=noop com confidence baixa
- Backend registra no Supabase com status "synced" e action=noop
- Responde no Telegram pedindo reformulacao
- Exemplo: "Nao entendi o comando. Tente: 'criar tarefa pagar conta de luz'"

## 2) Varias tarefas no mesmo audio
- OpenAI deve identificar e separar (ate 5 tarefas)
- Backend cria multiplos cards no Notion
- Responde no Telegram confirmando lista
- Evento no Supabase registra todas as acoes

## 3) Ambiguidade em update ("tarefa do imposto")
- OpenAI escolhe melhor match baseado no contexto
- Backend executa a acao
- Responde no Telegram: "Assumi que e X. Se nao for, diga: 'corrigir: e a tarefa Y'"
- Registra no Supabase para auditoria

## 4) Notion indisponivel
- Backend registra no Supabase com status "failed"
- error_message contem detalhes do erro
- Responde no Telegram: "Erro ao salvar tarefa. Tente novamente."
- Retry possivel via query: SELECT * FROM events WHERE status = 'failed'

## 5) Supabase indisponivel
- Backend retorna erro 500 ao webhook
- Telegram pode reenviar o update (retry automatico)
- Logs disponiveis no Vercel Dashboard

## 6) OpenAI indisponivel
- Backend registra no Supabase com status "failed" (se Supabase disponivel)
- Responde no Telegram: "Erro ao processar audio. Tente novamente."

## 7) Reprocessamento do mesmo message_id
- Constraint UNIQUE no Supabase impede duplicacao
- Backend detecta conflito e ignora (retorna 200 OK)
- Nao duplica tarefas no Notion
- Idempotencia garantida a nivel de banco

## 8) Webhook recebe update nao-audio
- Backend ignora mensagens sem voice/audio
- Retorna 200 OK para evitar retries do Telegram
- Nao registra no Supabase

## 9) Usuario nao autorizado
- Backend verifica TELEGRAM_ALLOWED_USERS
- Se usuario nao esta na lista: ignora
- Retorna 200 OK
- Nao registra no Supabase

## 10) Confidence < 60
- Backend NAO executa acao no Notion
- Registra no Supabase com action=noop e reason="low_confidence"
- Responde no Telegram pedindo reformulacao
- Exemplo: "Confianca baixa (45%). Por favor, reformule de forma mais clara."

## 11) Timeout da funcao serverless
- Vercel tem limite de 10s (hobby) ou 60s (pro)
- Se exceder, funcao e terminada
- Telegram pode reenviar o update
- Idempotencia garante que nao duplica

## 12) Audio muito longo
- OpenAI Whisper tem limite de 25MB
- Se exceder, retornar erro ao usuario
- Registrar no Supabase com status "failed"
