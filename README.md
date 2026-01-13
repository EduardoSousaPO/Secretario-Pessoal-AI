# AI Secretary

Voice to Task Automation via Telegram, OpenAI, Notion and Supabase.

## Arquitetura Cloud-First

O sistema opera **24/7** na nuvem, sem dependencia de computador local.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Telegram   │────▶│   Vercel    │────▶│  Supabase   │
│  (usuario)  │     │  (webhook)  │     │  (Postgres) │
└─────────────┘     └──────┬──────┘     └─────────────┘
     ▲                     │
     │              ┌──────▼──────┐
     └──────────────│   OpenAI    │──────▶ Notion
      confirmacao   │  (cerebro)  │        (Kanban)
                    └─────────────┘
```

## Stack

- **Vercel**: Backend serverless (Next.js API Routes)
- **Supabase**: Banco de dados Postgres gerenciado
- **OpenAI**: Transcricao (Whisper) + Interpretacao (GPT)
- **Notion**: Kanban de tarefas
- **Telegram**: Interface de voz

## Quick Start

### 1. Clone e instale

```bash
cd ai-secretary
npm install
```

### 2. Configure variaveis de ambiente

```bash
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

### 3. Desenvolvimento local

```bash
npm run dev
```

### 4. Deploy na Vercel

```bash
npx vercel
```

### 5. Configure o webhook do Telegram

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://seu-projeto.vercel.app/api/telegram/webhook"}'
```

## Comandos de Voz

| Comando | Acao |
|---------|------|
| "criar tarefa pagar conta de luz" | Cria tarefa no Notion |
| "marcar tarefa X como concluida" | Move para DONE |
| "atualizar tarefa Y para urgente" | Atualiza prioridade |
| "minhas tarefas pendentes" | Lista top 5 |

## Documentos Canonicos

- [00_CANONICAL.md](docs/00_CANONICAL.md) - Ordem de precedencia
- [01_VISION.md](docs/01_VISION.md) - Visao do produto
- [02_SCOPE.md](docs/02_SCOPE.md) - Escopo MVP
- [03_REQUIREMENTS.md](docs/03_REQUIREMENTS.md) - Requisitos
- [04_DATA_MODEL.md](docs/04_DATA_MODEL.md) - Modelo de dados (Supabase)
- [05_INTEGRATIONS.md](docs/05_INTEGRATIONS.md) - Contratos de integracao
- [06_WORKFLOWS.md](docs/06_WORKFLOWS.md) - Fluxos
- [07_EDGE_CASES.md](docs/07_EDGE_CASES.md) - Casos de borda
- [08_SECURITY_PRIVACY.md](docs/08_SECURITY_PRIVACY.md) - Seguranca
- [09_TEST_PLAN.md](docs/09_TEST_PLAN.md) - Plano de testes
- [10_RUNBOOK.md](docs/10_RUNBOOK.md) - Operacao
- [RULES.md](docs/RULES.md) - Regras do agente
- [CHANGELOG.md](docs/CHANGELOG.md) - Historico

## Estrutura do Projeto

```
ai-secretary/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── telegram/
│   │   │       └── webhook/
│   │   │           └── route.ts    # Webhook endpoint
│   │   ├── page.tsx                # Landing page
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── lib/
│   │   ├── supabase.ts             # Cliente Supabase
│   │   ├── openai.ts               # Cliente OpenAI
│   │   ├── notion.ts               # Cliente Notion
│   │   ├── telegram.ts             # Cliente Telegram
│   │   └── eisenhower.ts           # Classificador
│   └── __tests__/
│       └── eisenhower.test.ts
├── docs/                           # Documentos canonicos
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── vitest.config.ts
```

## Testes

```bash
npm run test        # Watch mode
npm run test:run    # Single run
```

## Variaveis de Ambiente

| Variavel | Descricao |
|----------|-----------|
| `TELEGRAM_BOT_TOKEN` | Token do bot (@BotFather) |
| `TELEGRAM_ALLOWED_USERS` | IDs permitidos (ex: 123,456) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role |
| `OPENAI_API_KEY` | API key da OpenAI |
| `NOTION_TOKEN` | Token da integration |
| `NOTION_DATABASE_ID` | ID do database |

## Principio OpenAI-First

**TODA** interpretacao semantica e delegada a OpenAI.
O backend apenas:
- Valida schema JSON
- Executa mapeamentos deterministicos
- Persiste dados
- Orquestra integrações

## License

MIT
