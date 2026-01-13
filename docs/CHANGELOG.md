# Changelog

## v0.2.1 - Implementacao Cloud-First (2026-01-13)

### Refatoracao Completa
- Projeto refatorado de Python para TypeScript/Next.js
- Estrutura compativel com Vercel serverless

### Supabase
- Banco de dados configurado via MCP
- Tabelas `events` e `tasks_map` criadas
- RLS habilitado com politicas para service_role
- Indices para performance
- Triggers para updated_at automatico

### Codigo Implementado
- `src/lib/supabase.ts`: Cliente Supabase com todas as operacoes
- `src/lib/openai.ts`: Transcricao (Whisper) + Interpretacao (GPT)
- `src/lib/notion.ts`: CRUD de tarefas no Notion
- `src/lib/telegram.ts`: Download de audio + envio de mensagens
- `src/lib/eisenhower.ts`: Classificador da matriz
- `src/app/api/telegram/webhook/route.ts`: Endpoint do webhook
- `src/app/page.tsx`: Landing page informativa

### Testes
- Testes unitarios para eisenhower.ts
- Configuracao do Vitest

### Configuracao
- package.json com dependencias
- tsconfig.json para TypeScript
- tailwind.config.ts para estilos
- .env.example atualizado

---

## v0.2.0 - Cloud-First Architecture (2026-01-13)

### Arquitetura
- **BREAKING**: Migracao para arquitetura 100% cloud
- Backend agora roda na **Vercel** (serverless, always-on)
- Banco de dados migrado para **Supabase** (Postgres gerenciado)
- Telegram agora usa **Webhook** (nao mais polling)
- Sistema opera **24/7** sem dependencia de computador local

### Documentos Atualizados

#### 00_CANONICAL.md
- Adicionada secao sobre arquitetura cloud-first
- Reforco das proibicoes (nao usar polling, nao usar banco local)

#### 01_VISION.md
- Adicionada secao sobre operacao 24/7
- Stack de producao documentada

#### 02_SCOPE.md
- Infraestrutura cloud adicionada ao MVP
- Principio OpenAI-First documentado
- Polling e banco local movidos para "fora do escopo"

#### 03_REQUIREMENTS.md
- RF-01 atualizado para webhook (nao polling)
- RF-02 atualizado para persistir no Supabase
- RF-03 reforco do principio OpenAI-First
- RNF-01 constraint UNIQUE no Supabase
- RNF-03 variaveis de ambiente na Vercel + RLS
- RNF-05 novo: disponibilidade 24/7

#### 04_DATA_MODEL.md
- Modelo completo para Supabase (Postgres)
- Schema SQL para tabelas events e tasks_map
- Indices para performance
- Triggers para updated_at
- Row Level Security (RLS) configurado
- Constraint UNIQUE para idempotencia

#### 05_INTEGRATIONS.md
- Diagrama de arquitetura cloud
- Telegram: configuracao de webhook
- Supabase: operacoes CRUD
- OpenAI: reforco do principio OpenAI-First
- Notion: sem alteracoes
- Variaveis de ambiente da Vercel

#### 06_WORKFLOWS.md
- Fluxos atualizados para arquitetura cloud
- Diagrama de sequencia com Supabase
- Tratamento de erros documentado

#### 07_EDGE_CASES.md
- Casos de borda atualizados para ambiente cloud
- Tratamento de indisponibilidade de servicos
- Timeout de funcao serverless
- Audio muito longo

#### 08_SECURITY_PRIVACY.md
- Variaveis de ambiente na Vercel
- Row Level Security no Supabase
- Allowlist de usuarios
- Seguranca do webhook

#### 09_TEST_PLAN.md
- Testes atualizados para ambiente cloud
- Testes de resiliencia
- Testes de seguranca
- Metricas de qualidade

#### 10_RUNBOOK.md
- Guia completo de setup cloud
- Configuracao do Supabase com SQL
- Deploy na Vercel
- Configuracao do webhook
- Troubleshooting
- Checklist de verificacao

#### RULES.md
- Arquitetura cloud-first documentada
- Principio OpenAI-First reforçado
- Proibicoes absolutas listadas

### Conformidade
- Sistema nao depende de execucao local
- Sistema opera 24/7 automaticamente
- Toda interpretacao delegada a OpenAI
- Idempotencia garantida a nivel de banco

---

## v0.1.1 - MVP Implementado (2026-01-13)

### Implementado
- **telegram_client.py**: Cliente completo do Telegram
  - Polling via getUpdates
  - Download de arquivos de audio (voice/audio)
  - Envio de mensagens de confirmacao
  - Verificacao de usuarios permitidos (allowlist)

- **openai_client.py**: Cliente da OpenAI
  - Transcricao de audio com Whisper
  - Chat completion para interpretacao de intencoes

- **parser.py**: Parser de intencoes
  - Schema canonico conforme docs/06_WORKFLOWS.md
  - Extracao de intent, confidence, task_ref e fields
  - Validacao e normalizacao de valores canonicos
  - Processamento de datas relativas (amanha, hoje, segunda, etc.)
  - **Regra critica**: confidence < 60 forca intent=noop

- **eisenhower.py**: Classificador da Matriz de Eisenhower
  - Mapeamento importance/urgency para quadrantes (Do, Decide, Delegate, Delete)
  - Conversao para status canonicos do Kanban (docs/04_DATA_MODEL.md)
  - Medium tratado como High para nao perder tarefas

- **notion_client.py**: Cliente do Notion
  - Criacao de tarefas com todas as propriedades canonicas
  - Atualizacao de tarefas existentes
  - Busca por titulo aproximado + status != DONE
  - Listagem de tarefas pendentes ordenadas por urgencia/importancia
  - Marcacao de tarefas como concluidas (DONE)

- **storage.py**: Storage local com SQLite
  - Tabela events para auditoria completa
  - Tabela tasks_map para facilitar updates
  - **Idempotencia**: chave (chat_id, message_id) impede duplicacao
  - Indices para performance

- **app.py**: Loop principal
  - Polling do Telegram
  - Fluxo completo: audio -> transcricao -> parser -> eisenhower -> notion -> confirmacao
  - Logs estruturados em JSON (trace_id por mensagem)
  - Tratamento de erros com notificacao no Telegram

- **config.py**: Configuracoes
  - Carregamento de .env
  - Validacao de variaveis obrigatorias
  - Allowlist de usuarios

- **utils.py**: Utilitarios
  - Geracao de trace_id (UUID)
  - Logging estruturado em JSON
  - Formatacao de resumo de tarefas

### Testes
- Testes unitarios para eisenhower.py (todas as combinacoes)
- Testes unitarios para parser.py (validacao, normalizacao, datas)
- Testes baseados nos criterios de aceite do docs/03_REQUIREMENTS.md

### Arquivos de Configuracao
- requirements.txt com dependencias
- .env.example com variaveis necessarias

### Conformidade com Documentos Canonicos
- Propriedades do Notion conforme docs/04_DATA_MODEL.md
- Status do Kanban conforme docs/04_DATA_MODEL.md - 4.3
- Schema de intencao conforme docs/06_WORKFLOWS.md - 6.5
- Fluxos conforme docs/06_WORKFLOWS.md
- Idempotencia conforme docs/RULES.md R3 e docs/03_REQUIREMENTS.md RNF-01
- Logs estruturados conforme docs/RULES.md R5

---

## v0.1.0 - SDD Inicial
- SDD inicial: visao, escopo, requisitos, modelo de dados, integracoes, workflows, seguranca, testes, runbook
