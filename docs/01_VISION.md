# 01 — Visao do Produto

## Problema
Ideias e tarefas surgem a qualquer momento. Registrar e organizar isso manualmente no Notion custa energia e tempo.

## Solucao
Enviar audio no Telegram (mais rapido). O sistema transcreve e transforma em tarefas estruturadas no Notion,
mantendo o Kanban sempre atualizado.

## Arquitetura Cloud-First
O sistema opera **24 horas por dia, 7 dias por semana**, sem necessidade de:
- Computador do usuario ligado
- Execucao manual de scripts
- Monitoramento constante

### Stack de producao:
- **Vercel**: Backend serverless sempre disponivel
- **Supabase**: Banco de dados Postgres na nuvem
- **Telegram Webhook**: Recebe mensagens instantaneamente
- **OpenAI**: Cerebro unico para transcricao e interpretacao

## Resultado esperado
- Captura rapida (voz) -> tarefa em segundos, a qualquer hora
- Sistema autonomo que nao depende do computador do usuario
- Menos esquecimento e retrabalho
- Priorizacao consistente (Eisenhower)
- Historico auditavel (o que foi criado/alterado por qual audio)

## Usuario-alvo
Uma pessoa (voce) operando via grupo no Telegram com um bot.
O sistema responde automaticamente, mesmo de madrugada.
