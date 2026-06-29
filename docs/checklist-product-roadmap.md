# Checklist — Roadmap BizPilot

## 1. Onboarding — Tipos de Negócio

- [ ] Definir lista completa de tipos (ver seção abaixo)
- [ ] Mapear cada tipo → `niche` + `role` + `capabilities` + template de `systemPrompt`
- [ ] Reescrever `NewAgentView`: grupo → subcategoria (dois passos)
- [ ] Pré-preencher `agentName` sugerido, `niche`, `role` e `systemPrompt` ao selecionar tipo
- [ ] Manter opção "Personalizado" com checkboxes livres

### Tipos de Negócio (rascunho)

| Grupo | Tipos |
|---|---|
| Saúde & Beleza | Salão de Beleza, Barbearia, Estética, Clínica Médica, Dentista, Psicólogo, Nutricionista, Dermatologista |
| Alimentação | Restaurante, Delivery, Lanchonete, Confeitaria, Marmitaria, Food Truck |
| Fitness | Academia, Personal Trainer, Studio de Pilates, Crossfit |
| Imóveis | Imobiliária, Corretor Autônomo |
| Educação | Escola / Curso, Curso Online, Professor Particular, Pré-vestibular |
| Profissional Liberal | Advogado, Contador, Coach / Mentor, Engenheiro, Arquiteto, Segurador |
| Comércio | Loja Física, E-commerce, Pet Shop, Farmácia, Ótica |
| Marketing Digital | Afiliado Shopee, Afiliado Mercado Livre, Afiliado AliExpress, Afiliado TikTok Shop, Agência, Criador de Conteúdo |
| Outros | Personalizado |

---

## 2. System Prompts por Tipo de Negócio

- [ ] Escrever template de instrução base para cada grupo (8 grupos × 1 prompt base)
- [ ] Definir variáveis do template: `{niche}`, `{agentName}`, `{businessName}`
- [ ] Decidir onde armazenar: objeto no código (simples) ou tabela `prompt_templates` no Supabase (flexível)
- [ ] Aplicar o template ao criar agente (pré-preencher campo "Instruções")
- [ ] Garantir que o prompt inclui instruções claras sobre como usar as ferramentas disponíveis

---

## 3. Planos e Extras

- [ ] Definir nomes e limites dos 3 planos (ex: Starter / Pro / Business)
- [ ] Criar tabela de comparação definitiva (features × planos)
- [ ] Adicionar campo `plan` na tabela `users` / `subscriptions` no Supabase
- [ ] Criar migration Supabase para planos
- [ ] Gatear capabilities pelo plano:
  - `affiliate` → Pro+
  - `commerce` (pagamentos) → Pro+
  - bots adicionais → conforme plano
- [ ] UI: exibir plano atual em Settings
- [ ] UI: "prompt de upgrade" quando usuário tenta usar feature bloqueada
- [ ] Definir Extras avulsos (bot adicional, integração extra, relatórios...)
- [ ] Integração com gateway de pagamento (a definir: Stripe, Pagar.me, Asaas...)

### Rascunho de Planos

| Feature | Starter | Pro | Business |
|---|---|---|---|
| Bots | 1 | 3 | Ilimitado |
| Memória de dados | ✓ | ✓ | ✓ |
| Repasse para humano | ✓ | ✓ | ✓ |
| Pagamentos / Agendamento | — | ✓ | ✓ |
| Afiliados (qualquer plataforma) | — | ✓ | ✓ |
| Grupos de Promoções | — | ✓ | ✓ |
| Bots extras (add-on) | — | ✓ | ✓ |
| White label / API | — | — | ✓ |

---

## 4. Reorganização — Afiliados em Integrações

- [ ] Mover "Grupos de Promoções" de `AddonsTab` → `IntegrationsTab` (card Afiliados)
- [ ] Card Afiliados em Integrações passa a ter:
  - Conectar conta (por plataforma)
  - Grupos de WhatsApp para publicação
  - Configuração de frequência / horário de publicação
- [ ] Remover seção de grupos de `AddonsTab`

---

## 5. Novas Plataformas de Afiliados

### 5a. Mercado Livre
- [ ] Pesquisar API de afiliados / produto do ML (Mercado Affiliates)
- [ ] Criar integração: conectar conta ML em `IntegrationsTab`
- [ ] Salvar credenciais no Supabase (tabela `integrations`, provider `mercadolivre`)
- [ ] Criar rota `/api/mercadolivre/search`
- [ ] Adicionar tool `buscar_produto_ml` no Windmill

### 5b. AliExpress
- [ ] Pesquisar API de afiliados AliExpress (Portals)
- [ ] Criar integração: conectar conta AliExpress
- [ ] Criar rota `/api/aliexpress/search`
- [ ] Adicionar tool `buscar_produto_aliexpress` no Windmill

### 5c. TikTok Shop
- [ ] Pesquisar API de afiliados TikTok Shop
- [ ] Criar integração: conectar conta TikTok Shop
- [ ] Criar rota `/api/tiktok/search`
- [ ] Adicionar tool `buscar_produto_tiktok` no Windmill

### 5d. Windmill — Multi-plataforma
- [ ] Atualizar tool `buscar_produto_afiliado` para aceitar parâmetro `plataforma`
- [ ] Roteamento: chamar API certa conforme plataforma configurada no agente
- [ ] Atualizar `sendAffiliateCardsFallback` para formatar cards de cada plataforma
- [ ] Publicar script atualizado no Windmill

---

## Ordem Sugerida de Execução

1. **Tipos de Negócio + onboarding** (maior impacto visual, define base para o resto)
2. **System Prompts** (junto com tipos de negócio)
3. **Reorganização Afiliados** (pequena, rápida)
4. **Planos** (requer decisão de negócio antes de codar)
5. **ML + AliExpress + TikTok** (pesquisa de API primeiro, depois implementação)
