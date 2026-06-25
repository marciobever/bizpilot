# Sessão de desenvolvimento — 25/06/2026

## O que foi feito hoje

### 1. Chatbot de suporte — restrições de plano
- `app/api/support-chat/route.ts`: busca o plano do usuário no Supabase antes de chamar a OpenAI; injeta no system prompt como contexto obrigatório (`REGRAS DE PLANO`)
- `app/api/support-chat/tools.ts`: `executeTool` recebe `userPlan` e bloqueia ferramentas restritas retornando mensagem de upgrade amigável; `getUserPlan()` exportada para o route usar
- Planos respeitados: Básico não vê Voz/Memória/Ações/E-mail/Pagamentos/Webhook; Profissional não vê Calendário/Instagram/Facebook

### 2. Instruções do agente mais ricas
- `src/lib/agentTemplates.ts`: `composeSystemPrompt` agora aceita `tone` e `extraFunctions` como parâmetros
- 4 novos blocos gerados automaticamente em todo agente criado pelo wizard:
  - `=== TOM DE COMUNICAÇÃO ===` — dinâmico por tom escolhido (Profissional / Amigável / Descontraído / Técnico)
  - `=== FLUXO DE CONVERSA ===` — uma pergunta por vez, mensagens curtas para WhatsApp
  - `=== QUANDO NÃO SOUBER ===` — nunca inventar, verificar com a equipe
  - `=== ATENDIMENTO HUMANO ===` — escalada imediata quando cliente pedir
- `buildCustomPrompt` (setor "Outro") também atualizado com os mesmos blocos
- `KNOWLEDGE_BLOCK` reforçado: instrui usar buscar_conhecimento SEMPRE antes de responder

### 3. Funções customizadas com IA no wizard
- `app/api/agents/generate/route.ts`: novo field `generate_function` — recebe descrição em português do usuário e retorna `{ label, emoji, prompt }` pronto para injetar no system prompt
- `app/app/agents/wizard/_hooks/useWizardFlow.ts`: estado `customFunctions[]`, `addCustomFunction()` (chama API), `removeCustomFunction()`; `functionLabels()` inclui funções customizadas; `composeSystemPrompt` recebe `tone` e `customFunctions`
- `app/app/agents/wizard/_components/StagePanel.tsx`: stage `functions` ganhou campo de texto + botão "Converter com IA"; funções geradas aparecem como chips toggleáveis com botão X para remover

## Próximos passos (backlog)

| # | Tarefa | Status |
|---|--------|--------|
| 8 | Integração Marketplace — Mercado Livre afiliados | pendente |
| 9 | Integração Marketplace — Amazon afiliados (PA-API) | pendente |
| 10 | Integração Marketplace — Shopee afiliados (chave do usuário) | pendente |
| 4 | Integração Mercado Livre — notificações de pedidos via WhatsApp | pendente |

## Decisões de arquitetura

- **Windmill não precisa mudar**: todo enriquecimento de prompt fica no `system_prompt` salvo no Supabase; o Windmill só lê e usa
- **Funções customizadas**: ID gerado com `custom_${Date.now()}`, não persiste no banco separado — vai embedded no `system_prompt` já composto
- **Plano de afiliados Marketplace**: usuário configura o próprio ID de afiliado (não conta da plataforma) — mais escalável
- **Ordem de implementação Marketplace**: ML (API pública, sem aprovação) → Amazon (precisa aprovação Associates) → Shopee (API oficial com chave do usuário)
