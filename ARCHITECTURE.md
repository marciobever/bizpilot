# Arquitetura do Sistema BizPilot

Para que os agentes conversem com inteligência e executem ações, a arquitetura foi desenhada para ter o **menor tempo de resposta (latência) possível**.

## Como funciona a "Conversa"? Precisa de Banco de Dados?

**Para simplesmente gerar uma resposta (stateless), não precisaria de banco.** O webhook bateria no nosso Node.js, chamaria a LLM (Gemini/OpenAI) e devolveria.

**Mas para ser um "Funcionário Virtual", SIM, precisamos de um banco (recomendação: Supabase).** Por quê?
1. **Memória de Curto e Longo Prazo:** A IA precisa saber o que foi conversado a 5 minutos atrás (armazenar o log do chat em uma tabela `messages`).
2. **Contexto do Lead:** Saber se esse caraute (número de WhatsApp) já comprou antes, se o nome dele é João, etc.
3. **Configuração do Próprio Agente:** Nossa API precisa ler o "Prompt" e as "Ferramentas" daquele agente direto do banco antes de chamar a inteligência.

## O Fluxo de Dados (Core Loop)

1. **Cliente envia mensagem:** Mensagem chega no WhatsApp.
2. **Evolution API avisa nosso backend:** O Evolution dispara um Webhook para o nosso servidor Node.js (`server.ts -> /api/webhooks/whatsapp`).
3. **Backend puxa a memória:** Nosso Node.js consulta o Supabase buscando o histórico da conversa e as instruções do Agente.
4. **Chamada da Inteligência (LLM):** O Node.js chama o modelo (Ex: Gemini 1.5 Flash), enviando a memória + prompt + lista de "Tools" disponíveis.
5. **Ação ou Resposta?**
   - *Se a IA decidir apenas falar:* Ela gera o texto, salvamos no Supabase e enviamos de volta pro Evolution.
   - *Se a IA decidir agir (Ex: "buscar_imoveis"):* O modelo avisa nosso Node.js. 

## Windmill vs n8n para as Ferramentas (Tools)

A sua intuição está 100% correta. 

O "cérebro conversacional" fica no nosso backend Node.js dedicado (para garantir que a IA responda em 1 ou 2 segundos). Mas quando a IA decide **fazer uma ação complexa**, disparamos para um orquestrador.

**Por que Windmill é superior ao n8n neste cenário:**
- **Latência:** Windmill roda scripts (Deno, Python) brutalmente rápidos comparado aos nós do n8n. Quando a IA pedir para "checar agenda", o Windmill retorna em milissegundos.
- **Developer Experience (Manutenção):** Fluxos complexos no n8n viram um "macarrão visual". No Windmill, você escreve um script simples que é muito mais fácil de versionar e dar manutenção a longo prazo.
- **Integração como API:** Cada script no Windmill vira automaticamente um Endpoint (REST API), o que o torna perfeito para plugar na função de `Tools` do nosso Agente AI.

## Resumo da Stack

- **Frontend/Dashboard:** React + Tailwind (Next.js-like architecture no Vite).
- **Backend (Orquestrador Chat):** Express Node.js (Recebe webhooks webhook do wpp, fala com Gemini, lê DB).
- **Database (Memória & Sync):** Supabase (PostgreSQL relacional super rápido e tempo real).
- **Tarefas Pesadas/Integrações Externas:** Windmill (Onde você vai plugar CRMs, disparar emails no Resend/Stripe, e fazer as queries complexas).
