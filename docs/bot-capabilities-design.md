# Design: Capacidades por Propósito do Bot

## Problema

O sistema atual usa toggles individuais (dataRecordsEnabled, etc.) que:
- Ficam desligados por padrão e o usuário não sabe que precisa ativar
- Não escalam para bots "custom" (personal trainer, babá, coach, nutricionista...)
- Geram bugs: bot financeiro criado sem salvar_dado, bot afiliado sem os grupos

## Solução: Eixos de Capacidade

Em vez de tipos fixos, o bot responde 4 perguntas independentes no momento da criação.

### Os 4 Eixos

| Eixo | Config | Ativa |
|---|---|---|
| Memória de dados | `capabilities.dataRecords` | `salvar_dado`, `consultar_dados` |
| Afiliados Shopee | `capabilities.affiliate` | `buscar_produto_afiliado`, publicar em grupos |
| Comércio | `capabilities.commerce` | `gerar_link_pagamento`, `agendar_horario`, `reagendar_horario`, `cancelar_agendamento` |
| Atendimento humano | `capabilities.handoff` | `transferir_atendimento` |

> Memória longa (contact_memory), base de conhecimento e `reagir_mensagem`/`refletir` são universais — sempre ativos.

### Pré-sets na criação

```
○ Atendimento ao cliente
    commerce=true, handoff=true, dataRecords=false, affiliate=false

○ Assistente pessoal
    dataRecords=true, commerce=false, handoff=false, affiliate=false
    (personal trainer, financeiro, coach, babá, nutricionista...)

○ Afiliado Shopee
    affiliate=true, dataRecords=true, commerce=false, handoff=false

○ Personalizado
    □ Registra dados do usuário    → dataRecords
    □ Afiliados Shopee             → affiliate
    □ Pagamentos e agendamento     → commerce
    □ Transferência para humano    → handoff
```

### Config final no agents.config

```json
{
  "capabilities": {
    "dataRecords": true,
    "affiliate": false,
    "commerce": false,
    "handoff": false
  }
}
```

---

## O que muda no código

### 1. Windmill — 2_ai_processor.ts

Substituir as 5+ verificações independentes por leitura direta de `config.capabilities`:

```typescript
// ANTES (atual — frágil)
const hasDataRecords  = config.dataRecordsEnabled !== false;
const hasPayments     = paymentsIntegration?.status === 'connected';
const hasCalendar     = calendarIntegration?.status === 'connected';
// ...

// DEPOIS
const caps = config.capabilities || {};
const hasDataRecords = !!caps.dataRecords;
const hasCommerce    = !!caps.commerce;
const hasAffiliate   = !!caps.affiliate;
const hasHandoff     = !!caps.handoff;

// Integrações ainda validam se o serviço está conectado,
// mas a FERRAMENTA só aparece se o eixo estiver ativo
const hasPayments = hasCommerce && paymentsIntegration?.status === 'connected';
const hasCalendar = hasCommerce && calendarIntegration?.status === 'connected';
```

### 2. Frontend — tela de criação do bot

- Substituir o campo "tipo" (dropdown simples) pelo seletor de propósito com pré-sets
- Ao selecionar um pré-set, preenche `capabilities` automaticamente
- Modo "Personalizado" mostra os 4 checkboxes

### 3. Frontend — AddonsTab

- Remover toggles de dataRecords (fica no propósito, não nas funcionalidades)
- Manter: voz, arquivos de mídia, ferramentas customizadas (webhook)

### 4. Migração de agentes existentes

Ao carregar um agente antigo (sem `capabilities`), derivar pelo campo `type`:

```typescript
if (!cfg.capabilities) {
  cfg.capabilities = {
    dataRecords: ['assistente', 'financeiro'].includes(data.type) || !!cfg.dataRecordsEnabled,
    affiliate:   ['afiliado', 'afiliados'].includes(data.type),
    commerce:    data.type === 'atendimento',
    handoff:     data.type === 'atendimento',
  };
}
```

---

## Arquivos a modificar

1. `windmill/2_ai_processor.ts` — leitura de capabilities
2. `app/app/agents/new/` ou `_views/NewAgentView.tsx` — seletor de propósito
3. `app/app/agents/[id]/_tabs/AddonsTab.tsx` — remover toggle dataRecords
4. `app/app/agents/[id]/page.tsx` — migração automática de agentes sem capabilities
5. `app/app/agents/[id]/_hooks/useAgentForm.ts` — estado de capabilities

## O que NÃO muda

- Ferramentas customizadas (webhook) — continuam no AddonsTab
- Base de conhecimento — continua independente
- Configuração de voz — continua no AddonsTab
- Arquivos de mídia — continuam no AddonsTab
- Integrações (Shopee, Cal.com, Asaas) — continuam em /integrations

---

## Status atual (antes desta implementação)

- `dataRecords`: ativo por padrão via `!== false` — gambiarra temporária feita hoje
- `affiliate`: verificado via tabela `integrations` — funciona mas acoplado
- `commerce`: verificado via tabela `integrations` — idem
- `handoff`: sempre disponível — sem controle por tipo
