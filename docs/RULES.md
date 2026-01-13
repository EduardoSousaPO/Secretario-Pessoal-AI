# RULES — Regras de Operacao do Agente

## Proposito
Este documento define as regras que qualquer agente de IA (ou desenvolvedor) deve seguir ao implementar ou modificar o sistema.

---

## Arquitetura Cloud-First

O sistema opera 100% na nuvem:
- **Backend**: Vercel (serverless, always-on)
- **Banco de Dados**: Supabase (Postgres gerenciado)
- **Telegram**: Webhook (NAO polling)
- **Processamento**: OpenAI API

Nenhuma execucao local e necessaria apos o deploy.

---

## Regras Fundamentais

### R1 — Documentacao Primeiro
- Antes de implementar qualquer funcionalidade, verifique se ela esta documentada nos arquivos canonicos.
- Se nao estiver, documente PRIMEIRO e so depois implemente.

### R2 — Sem Invencoes
- Nao invente campos, endpoints, status ou propriedades do Notion.
- Tudo deve estar em docs/04_DATA_MODEL.md ou docs/05_INTEGRATIONS.md.

### R3 — Idempotencia Obrigatoria
- Toda operacao que modifica estado deve ser idempotente.
- A chave (chat_id, message_id) e sagrada para evitar duplicacoes.
- Constraint UNIQUE no Supabase garante isso a nivel de banco.

### R4 — Falha Segura
- Em caso de duvida na interpretacao, use intent=noop e peca reformulacao.
- Nunca assuma uma acao destrutiva sem confirmacao.
- Se confidence < 60: NAO executar acao no Notion.

### R5 — Logs Estruturados
- Todo evento deve ter um trace_id.
- Logs devem ser em JSON para facilitar analise.
- Eventos persistidos no Supabase para auditoria.

### R6 — Seguranca por Padrao
- Tokens nunca em codigo (usar variaveis de ambiente da Vercel).
- Usuarios devem estar na allowlist para serem processados.
- Supabase com RLS habilitado.

### R7 — Changelog Atualizado
- Toda mudanca relevante deve atualizar docs/CHANGELOG.md.

### R8 — Testes Antes de Merge
- Funcionalidades novas devem ter testes correspondentes em docs/09_TEST_PLAN.md.

---

## Principio OpenAI-First (CRITICO)

### O que significa
- **TODA** interpretacao semantica e responsabilidade da OpenAI
- O backend e apenas um orquestrador
- O backend NAO toma decisoes de significado

### O que o backend FAZ
- Recebe webhook do Telegram
- Baixa audio
- Chama OpenAI para transcricao
- Chama OpenAI para interpretacao
- Valida schema JSON retornado
- Executa mapeamento deterministico (Eisenhower -> Status)
- Persiste no Supabase
- Executa acao no Notion
- Responde no Telegram

### O que o backend NAO FAZ
- Interpretar linguagem natural
- Inferir intencao do usuario
- Classificar prioridade/urgencia
- Detectar ambiguidade
- Corrigir ou melhorar output da OpenAI
- Implementar heuristicas de NLP
- Adivinhar campos ausentes

### Regra de ouro
Se a OpenAI retornar algo invalido:
1. Registrar no Supabase com status "failed"
2. Pedir reformulacao ao usuario
3. NAO tentar corrigir ou adivinhar

---

## Proibicoes Absolutas

1. **NAO** implementar logica de NLP no backend
2. **NAO** usar polling local (apenas webhook)
3. **NAO** usar banco local (apenas Supabase)
4. **NAO** assumir execucao em computador do usuario
5. **NAO** criar campos do Notion nao documentados
6. **NAO** modificar output semantico da OpenAI
7. **NAO** expandir escopo sem atualizar docs

---

## Ordem de Precedencia
Ver docs/00_CANONICAL.md para a hierarquia completa de documentos.
