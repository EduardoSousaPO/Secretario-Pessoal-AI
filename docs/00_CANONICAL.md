# 00 — Fonte Canonica e Ordem de Leitura (OBRIGATORIO)

## Regra de ouro
Qualquer mudanca no codigo DEVE estar alinhada com os documentos canonicos abaixo.
Se houver conflito entre documentos, a ordem de precedencia define "quem manda".

## Arquitetura Cloud-First
Este sistema opera 100% na nuvem, sem dependencia de execucao local:
- **Backend**: Vercel (serverless, always-on)
- **Banco de Dados**: Supabase (Postgres gerenciado)
- **Telegram**: Webhook (nao polling)
- **Processamento**: OpenAI API

O sistema funciona 24/7 automaticamente. Nenhuma execucao manual e necessaria apos o deploy.

## Ordem de precedencia (canonico -> derivado)
1. docs/RULES.md (regras de operacao do agente e processo)
2. docs/03_REQUIREMENTS.md (requisitos funcionais e nao funcionais)
3. docs/04_DATA_MODEL.md (campos, status, IDs, tabelas e mapeamentos - Supabase)
4. docs/06_WORKFLOWS.md (fluxos e estados)
5. docs/05_INTEGRATIONS.md (contratos de integracao - Telegram webhook, Supabase, OpenAI, Notion)
6. docs/08_SECURITY_PRIVACY.md (seguranca e privacidade - RLS, env vars)
7. docs/09_TEST_PLAN.md (testes)
8. docs/10_RUNBOOK.md (operacao - deploy Vercel)
9. docs/01_VISION.md e docs/02_SCOPE.md (contexto)

## Proibicao
- E proibido inventar endpoints, campos do Notion, nomes de propriedades ou status
  sem registrar em docs/04_DATA_MODEL.md e docs/05_INTEGRATIONS.md.
- E proibido implementar logica de NLP ou heuristicas no backend.
  TODA interpretacao e responsabilidade da OpenAI.
- E proibido assumir execucao local (polling, scripts manuais, cron local).

## Mudancas
Toda mudanca relevante deve atualizar:
- docs/CHANGELOG.md (versao e resumo)
- documento canonico impactado (ex: requirements/data model/workflows)
