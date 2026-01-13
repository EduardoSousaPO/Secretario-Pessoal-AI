# 09 — Plano de Testes

## Ambiente de Testes

### Local (desenvolvimento)
- Testes unitarios com Jest/Vitest
- Mocks para Supabase, OpenAI, Notion, Telegram

### Staging (pre-producao)
- Deploy em branch de preview na Vercel
- Supabase de desenvolvimento (projeto separado)
- Bot de teste no Telegram

### Producao
- Monitoramento via Vercel Dashboard
- Logs no Supabase
- Alertas em caso de falha

---

## Testes Unitarios

### eisenhower.ts
- Todas as combinacoes de importance/urgency
- Mapeamento para status canonicos
- Valores invalidos retornam default

### parser.ts
- Validacao de schema JSON
- Normalizacao de valores
- Tratamento de campos ausentes

### supabase-client.ts
- Operacoes CRUD mockadas
- Tratamento de erros de conexao
- Constraint de idempotencia

---

## Testes de Integracao

### Happy Path

#### create_task via audio
1. Simular webhook com audio
2. Verificar evento criado no Supabase
3. Verificar card criado no Notion
4. Verificar resposta no Telegram

#### update_task via audio
1. Criar tarefa de teste
2. Simular webhook com comando de update
3. Verificar tarefa atualizada no Notion
4. Verificar evento no Supabase

#### complete_task via audio
1. Criar tarefa de teste
2. Simular webhook com comando de conclusao
3. Verificar Status = DONE no Notion

#### list_tasks via audio
1. Criar algumas tarefas de teste
2. Simular webhook com comando de listagem
3. Verificar resposta formatada no Telegram

---

## Testes de Regressao

### Idempotencia
- Enviar mesmo message_id 2x
- Verificar que apenas 1 evento existe no Supabase
- Verificar que apenas 1 tarefa existe no Notion

### Ambiguidade
- Update com 2 possiveis matches
- Verificar que sistema escolhe um e avisa

### Confidence baixa
- Simular resposta da OpenAI com confidence < 60
- Verificar que Notion NAO e modificado
- Verificar resposta pedindo reformulacao

---

## Testes de Resiliencia

### Notion indisponivel
- Mockar erro 503 do Notion
- Verificar evento com status "failed" no Supabase
- Verificar resposta de erro no Telegram

### OpenAI indisponivel
- Mockar timeout da OpenAI
- Verificar tratamento de erro
- Verificar log no Supabase

### Supabase indisponivel
- Mockar erro de conexao
- Verificar que webhook retorna 500
- Telegram fara retry automatico

---

## Testes de Seguranca

### Usuario nao autorizado
- Simular webhook de usuario fora da allowlist
- Verificar que e ignorado
- Verificar que nao cria evento no Supabase

### Webhook sem audio
- Simular webhook com mensagem de texto
- Verificar que e ignorado
- Verificar retorno 200 OK

---

## Metricas de Qualidade

- Cobertura de testes: > 80%
- Tempo de resposta do webhook: < 5s
- Taxa de sucesso: > 99%
- Eventos com status "failed": < 1%
