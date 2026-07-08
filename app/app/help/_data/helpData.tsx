import React from "react";
import {
  Smartphone, Bot, Brain, Webhook, Mic, Tags, Wrench, Sparkles, AlertTriangle,
  MessageSquare, CreditCard, ShieldCheck, Lightbulb, HelpCircle, Zap, Mail, Megaphone,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Step, Code, Tip, ScreenMock, FeatureTag } from "../_components/HelpComponents";

export type Section = {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  subtitle: string;
  readTime: string;
  content: React.ReactNode;
};

export type FaqItem = { id: string; question: string; answer: React.ReactNode };

export type Category = {
  id: string;
  label: string;
  icon: React.ElementType;
  sectionIds: string[];
  description: string;
};

export type VideoItem = {
  id: string;
  title: string;
  description: string;
  duration: string;
};

export const VIDEO_ITEMS: VideoItem[] = [
  { id: "v1", title: "Criando seu primeiro agente", description: "Do zero ao agente pronto usando o assistente guiado em poucos minutos.", duration: "~5 min" },
  { id: "v2", title: "Conectando o WhatsApp (QR Code)", description: "Escaneie o QR Code e veja o status mudar para online em tempo real.", duration: "~3 min" },
  { id: "v3", title: "Base de Conhecimento na prática", description: "Adicione FAQs, tabela de preços e políticas — o agente passa a responder com precisão.", duration: "~4 min" },
  { id: "v4", title: "Configurando Ferramentas / Webhooks", description: "Conecte o agente ao seu sistema para agendar, consultar pedidos e muito mais.", duration: "~6 min" },
  { id: "v5", title: "Integrações de E-mail e Automações", description: "Configure envio de e-mail via SMTP ou Resend e integre com n8n/Zapier.", duration: "~4 min" },
  { id: "v6", title: "Gerenciando Conversas e Leads", description: "Filtre conversas por agente, assuma o atendimento manualmente e gerencie leads.", duration: "~3 min" },
];

export const SECTIONS: Section[] = [
  {
    id: "overview",
    icon: Sparkles,
    color: "text-brand-400 bg-brand-500/10",
    title: "Como o BizPilot funciona",
    subtitle: "Entenda o fluxo completo antes de configurar",
    readTime: "2 min",
    content: (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          O BizPilot cria <strong className="text-foreground">funcionários virtuais de IA</strong> que atendem seus clientes pelo WhatsApp 24h por dia.
          Tudo funciona em 3 camadas que trabalham juntas para cada agente que você criar:
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Smartphone, color: "text-emerald-400", bg: "bg-emerald-500/10", n: "01", title: "Canal (WhatsApp)", desc: "Recebe e envia mensagens. Use QR Code (grátis) ou Meta Oficial (Cloud API para volumes maiores)." },
            { icon: Bot, color: "text-brand-400", bg: "bg-brand-500/10", n: "02", title: "Agente (Cérebro)", desc: "Persona, tom de voz, instruções, modelo de IA. Você define como ele age e o que sabe." },
            { icon: Brain, color: "text-amber-400", bg: "bg-amber-500/10", n: "03", title: "Inteligência", desc: "Conhecimento (RAG), Ferramentas (ações), Memória de longo prazo por contato." },
          ].map(({ icon: Icon, color, bg, n, title, desc }) => (
            <div key={n} className="p-4 border border-border rounded-xl bg-secondary/10">
              <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{n}</span>
              <p className="text-sm font-medium mt-0.5">{title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-secondary/10 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">O que acontece quando um cliente manda mensagem:</p>
          <div className="space-y-2">
            {[
              "Áudio transcrito automaticamente (se necessário)",
              "Aguarda ~3s para juntar mensagens picadas (debounce)",
              "Busca histórico + memórias salvas do contato",
              "Consulta a Base de Conhecimento com busca semântica",
              "Chama Ferramentas se precisar (agendar, consultar, etc.)",
              "Gera e envia a resposta — texto ou áudio",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-[10px] font-mono text-brand-400 shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-xs text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>
        <Tip>
          Ordem recomendada: <strong>1) Criar o agente</strong> → <strong>2) Conectar o WhatsApp</strong> → <strong>3) Adicionar Base de Conhecimento</strong> → <strong>4) Configurar Ferramentas</strong> (opcional) → <strong>5) Testar</strong>.
        </Tip>
      </div>
    ),
  },
  {
    id: "agent",
    icon: Bot,
    color: "text-brand-400 bg-brand-500/10",
    title: "Configurar o Agente",
    subtitle: "Identidade, personalidade, instruções e modelo de IA",
    readTime: "4 min",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Acesse <strong className="text-foreground">Agentes → nome do agente</strong> para abrir a tela de configuração. Ela está dividida em abas — veja o que configurar em cada uma.
        </p>
        <ScreenMock label="Agentes → Configuração" hint="Aba Identidade · campos Nome, Tipo, Descrição" />
        <div className="space-y-3">
          <Step n={1} title="Identidade">
            Nome (como o agente se apresenta), tipo de trabalho (vendas, suporte, agendamento…) e uma descrição interna para você se organizar quando tiver vários agentes.
          </Step>
          <Step n={2} title="Personalidade">
            <span>Tom de voz, missão, o que o agente pode e não pode fazer. Escreva como se estivesse orientando um funcionário novo. Evite colocar aqui conteúdo que muda com frequência</span>
            <span className="text-foreground"> (preços, FAQs longas)</span>
            <span> — esse conteúdo vai na aba </span>
            <strong className="text-foreground">Conhecimento</strong>.
          </Step>
          <Step n={3} title="Configurações">
            Defina as regras de atendimento: contatos para transferência humana, se o bot responde em grupos e a lista de bloqueio.
          </Step>
          <Step n={4} title="Addons">
            Ative módulos extras: <strong className="text-foreground">Voz</strong> (resposta em áudio), <strong className="text-foreground">Memória</strong> de longo prazo, <strong className="text-foreground">Ferramentas</strong> (webhooks) e envio de <strong className="text-foreground">Mídia</strong> (imagens, PDFs, QR Pix).
          </Step>
          <Step n={5} title="Personalizada">
            Campo livre para instruções específicas do seu negócio — fluxos de conversa, scripts, regras de negócio avançadas. Use com moderação para não conflitar com a Personalidade.
          </Step>
          <Step n={6} title="Salvar">
            Clique em <strong className="text-foreground">Salvar</strong>. Só depois disso as abas Canais, Conhecimento e Ferramentas ficam disponíveis.
          </Step>
        </div>
        <Tip>
          Use o <strong>Assistente de Criação</strong> (botão "Criar com IA") para gerar o primeiro rascunho da personalidade automaticamente — muito mais rápido do que começar do zero.
        </Tip>
      </div>
    ),
  },
  {
    id: "whatsapp",
    icon: Smartphone,
    color: "text-emerald-400 bg-emerald-500/10",
    title: "Conectar o WhatsApp",
    subtitle: "QR Code (grátis) ou Meta Oficial (Cloud API)",
    readTime: "5 min",
    content: (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Conecte o WhatsApp do agente na aba <strong className="text-foreground">Canais</strong>. Há duas opções:
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">Opção 1 · Recomendada</Badge>
            <span className="text-sm font-medium">Evolution API — QR Code</span>
          </div>
          <ScreenMock label="Aba Canais → QR Code" hint="QR Code aparece aqui para escanear com o celular" />
          <div className="space-y-3 pl-1">
            <Step n={1} title="Salve o agente primeiro">Antes de conectar qualquer canal, clique em <strong className="text-foreground">Salvar</strong> na tela do agente. Sem salvar, o botão de conexão não aparece.</Step>
            <Step n={2} title="Vá até a aba Canais e clique em Conectar WhatsApp">O sistema gera um QR Code exclusivo para este agente.</Step>
            <Step n={3} title="Escaneie com o celular">Abra o WhatsApp → <strong className="text-foreground">Configurações → Aparelhos conectados → Conectar um aparelho</strong> → aponte a câmera para o QR Code.</Step>
            <Step n={4} title="Aguarde a confirmação">O status muda automaticamente para <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px] h-4">online</Badge> em alguns segundos.</Step>
          </div>
          <Tip>Funciona com qualquer número de WhatsApp (pessoal ou Business), sem custo de mensageria. O celular precisa ter internet ativa — igual ao WhatsApp Web.</Tip>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-brand-400 border-brand-500/30 text-[10px]">Opção 2 · Avançado</Badge>
            <span className="text-sm font-medium">Meta Oficial — WhatsApp Cloud API</span>
          </div>
          <div className="space-y-3 pl-1">
            <Step n={1} title="Crie um app no Meta for Developers">Acesse <Code>developers.facebook.com</Code> → crie um app do tipo <strong className="text-foreground">Business</strong> → adicione o produto <strong className="text-foreground">WhatsApp</strong>.</Step>
            <Step n={2} title="Copie as credenciais">Você vai precisar de: <Code>Phone Number ID</Code>, <Code>WABA ID</Code> e um token de acesso permanente (gerado em System Users).</Step>
            <Step n={3} title="Cole na aba Canais">Selecione <strong className="text-foreground">Meta Oficial</strong>, cole as credenciais e salve.</Step>
            <Step n={4} title="Configure o Webhook no painel do Meta">Em <strong className="text-foreground">Webhooks</strong>, aponte para a URL exibida na tela do agente. Use o <strong className="text-foreground">Verify Token</strong> mostrado ali e marque o campo <Code>messages</Code>.</Step>
          </div>
          <Tip variant="warn">A Meta só permite resposta livre dentro de uma janela de 24h após a última mensagem do cliente. Fora dessa janela, é necessário usar templates aprovados.</Tip>
        </div>
      </div>
    ),
  },
  {
    id: "knowledge",
    icon: Brain,
    color: "text-amber-400 bg-amber-500/10",
    title: "Base de Conhecimento (RAG)",
    subtitle: "Ensine o agente sobre seu negócio com textos e URLs",
    readTime: "4 min",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          A Base de Conhecimento permite que o agente "consulte" informações específicas do seu negócio antes de responder — sem precisar escrever tudo no prompt principal.
          Fica na aba <strong className="text-foreground">Conhecimento</strong> do agente.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 my-2">
          {[
            { title: "O que vale colocar aqui", items: ["Tabela de preços e planos", "FAQ — dúvidas frequentes", "Política de trocas e cancelamentos", "Descrição detalhada de produtos/serviços", "Horários e endereços", "Scripts de vendas e objeções comuns"] },
            { title: "O que não vai aqui", items: ["Tom de voz e personalidade → aba Personalidade", "Regras de comportamento → aba Instruções", "Ações que o agente executa → aba Ferramentas", "Saudação inicial → campo Greeting"] },
          ].map(({ title, items }) => (
            <div key={title} className="p-3 rounded-lg border border-border bg-secondary/10">
              <p className="text-xs font-medium mb-2">{title}</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {items.map((item) => <li key={item} className="flex items-start gap-1.5"><span className="text-brand-400 shrink-0">·</span>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <Step n={1} title="Clique em 'Adicionar'">Escolha <strong className="text-foreground">Texto</strong> (cole o conteúdo) ou <strong className="text-foreground">URL</strong> (o sistema acessa a página e extrai automaticamente).</Step>
        <Step n={2} title="Dê um título descritivo">Ex: "Tabela de Preços 2026", "FAQ — Dúvidas Frequentes", "Política de Trocas". Facilita a manutenção depois.</Step>
        <Step n={3} title="Cole ou confirme o conteúdo">Para textos longos, prefira dividir por assunto: um documento por tema. A busca fica mais precisa.</Step>
        <Step n={4} title="Salve e aguarde a vetorização">O sistema divide o texto em pedaços (chunks) e gera embeddings — representação matemática do significado para busca semântica.</Step>
        <Tip>Organize o conteúdo como se fosse um manual de treinamento para um novo funcionário. Quanto mais claro e organizado, melhor o agente responde.</Tip>
        <Tip variant="warn">Para atualizar uma informação, apague a entrada antiga e adicione a versão nova — o conteúdo não pode ser editado depois de salvo.</Tip>
      </div>
    ),
  },
  {
    id: "tools",
    icon: Webhook,
    color: "text-rose-400 bg-rose-500/10",
    title: "Ferramentas / Ações (Webhooks)",
    subtitle: "O agente executa ações reais — agendar, consultar, enviar",
    readTime: "6 min",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ferramentas conectam o agente a sistemas externos. Quando configurada, a IA decide <em>sozinha</em> quando chamar a ferramenta durante a conversa, preenche os parâmetros e processa o resultado.
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          <FeatureTag color="brand">Agendar consultas</FeatureTag>
          <FeatureTag color="emerald">Consultar pedidos</FeatureTag>
          <FeatureTag color="amber">Enviar orçamento</FeatureTag>
          <FeatureTag color="rose">Gerar QR Pix</FeatureTag>
          <FeatureTag color="brand">Cadastrar lead no CRM</FeatureTag>
          <FeatureTag color="emerald">Verificar estoque</FeatureTag>
        </div>
        <Step n={1} title="Vá até a aba Ferramentas e clique em 'Nova Ferramenta'">Cada ferramenta = uma ação que o agente pode executar no seu sistema.</Step>
        <Step n={2} title="Nome da ferramenta">Use snake_case sem espaços. Ex: <Code>agendar_consulta</Code>, <Code>consultar_pedido</Code>, <Code>gerar_boleto</Code>.</Step>
        <Step n={3} title="Descrição — a parte mais importante">
          Explique <strong className="text-foreground">quando</strong> a IA deve usar e <strong className="text-foreground">o que ela faz</strong>. A IA lê essa descrição para decidir se e quando chamar.
          <br /><span className="text-foreground font-medium">Ruim:</span> "Agenda."
          <br /><span className="text-foreground font-medium">Bom:</span> "Chame quando o cliente confirmar que quer agendar uma consulta e já tiver informado data e horário preferidos."
        </Step>
        <Step n={4} title="URL e Método">Informe a URL do seu endpoint (n8n, Zapier, sua própria API) e o método HTTP — geralmente <Code>POST</Code>.</Step>
        <Step n={5} title="Headers (se necessário)">Para autenticação: <Code>Authorization: Bearer SEU_TOKEN</Code> ou qualquer header que seu endpoint exija.</Step>
        <Step n={6} title="Parâmetros">Liste as informações que a IA deve coletar e enviar. Dê uma descrição clara de cada parâmetro — a IA extrai os valores da conversa automaticamente.</Step>
        <Step n={7} title="Como sua URL deve responder">Recebe um JSON via POST e deve retornar um <strong className="text-foreground">JSON</strong> com o resultado. A IA lê essa resposta e formula a mensagem ao cliente.</Step>
        <Tip>Comece com 1-2 ferramentas, bem descritas. Ferramentas demais com descrições vagas confundem a IA.</Tip>
        <Tip variant="warn">Se a ferramenta não estiver sendo chamada, revise a descrição — ela precisa deixar claro o gatilho exato. Teste mandando uma mensagem que simule exatamente o momento de uso.</Tip>
      </div>
    ),
  },
  {
    id: "memory",
    icon: MessageSquare,
    color: "text-sky-400 bg-sky-500/10",
    title: "Memória de Longo Prazo",
    subtitle: "O agente lembra de cada cliente entre conversas — automático",
    readTime: "2 min",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Não há nada para configurar — funciona automaticamente. Após cada conversa, o agente extrai fatos relevantes sobre o contato e guarda para usar nas próximas interações.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="p-4 border border-border rounded-xl bg-secondary/10 space-y-2">
            <p className="text-sm font-medium">O que é lembrado</p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {["Preferências de horário e produto", "Histórico de compras mencionadas", "Dados pessoais compartilhados (pets, região, profissão)", "Problemas ou reclamações anteriores", "Etapa no funil de vendas"].map((item) => (
                <li key={item} className="flex items-start gap-2"><span className="text-sky-400 shrink-0">·</span>{item}</li>
              ))}
            </ul>
          </div>
          <div className="p-4 border border-border rounded-xl bg-secondary/10 space-y-2">
            <p className="text-sm font-medium">Como isso ajuda na prática</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Na próxima conversa, o agente já começa com contexto: "Olá, Maria! Da última vez você perguntou sobre o plano anual…" — sem o cliente precisar repetir nada.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Isso aumenta significativamente a taxa de conversão e a satisfação do cliente.
            </p>
          </div>
        </div>
        <Tip>A memória é por contato (número de WhatsApp). Um mesmo contato que fala com dois agentes diferentes tem memórias separadas para cada um.</Tip>
      </div>
    ),
  },
  {
    id: "audio",
    icon: Mic,
    color: "text-fuchsia-400 bg-fuchsia-500/10",
    title: "Áudios e Mensagens",
    subtitle: "Transcrição automática + resposta no mesmo formato",
    readTime: "2 min",
    content: (
      <div className="space-y-3">
        <Step n={1} title="Cliente manda áudio">O sistema baixa o arquivo de áudio, transcreve automaticamente usando IA e processa o texto normalmente — sem intervenção manual.</Step>
        <Step n={2} title="Resposta em áudio (opcional)">Ative a opção <strong className="text-foreground">Responder em áudio</strong> na aba Addons. Quando ativada e o cliente tiver enviado áudio, a resposta também será enviada como mensagem de voz.</Step>
        <Step n={3} title="Mensagens picadas (debounce)">Se o cliente enviar várias mensagens curtas seguidas, o sistema aguarda ~3 segundos e junta tudo em uma única mensagem antes de responder. Evita respostas fragmentadas.</Step>
        <Tip variant="warn">Áudios muito longos (acima de alguns minutos) podem levar mais tempo para transcrever. Recomende ao cliente áudios objetivos para agilizar o atendimento.</Tip>
      </div>
    ),
  },
  {
    id: "email",
    icon: Mail,
    color: "text-violet-400 bg-violet-500/10",
    title: "Integrações de E-mail",
    subtitle: "Configure envio de e-mail pelo agente via SMTP, Resend ou SendGrid",
    readTime: "4 min",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Acesse <strong className="text-foreground">Integrações</strong> no menu lateral para configurar o envio de e-mail. O agente pode enviar e-mails automaticamente durante a conversa.
        </p>
        <div className="space-y-3">
          {[
            { badge: "Recomendado", label: "SMTP — Gmail, Outlook, Zoho ou servidor próprio", steps: ["Selecione o provedor (ou 'Personalizado' para servidor próprio).", "Use uma senha de app do Gmail (não sua senha normal) — gere em Conta Google → Segurança → Senhas de app.", "Clique em 'Testar conexão' antes de salvar para confirmar que está funcionando."] },
            { badge: "Avançado", label: "Resend ou SendGrid", steps: ["Ideal para alto volume ou domínio próprio verificado.", "Cole a API Key do Resend/SendGrid e salve.", "Nenhuma configuração extra necessária — funciona imediatamente."] },
          ].map(({ badge, label, steps }) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-violet-400 border-violet-500/30 text-[10px]">{badge}</Badge>
                <span className="text-sm font-medium">{label}</span>
              </div>
              <div className="space-y-2 pl-1">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-1">{i + 1}.</span>
                    <span className="text-sm text-muted-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Tip variant="warn">Para Gmail, nunca use sua senha principal — gere uma <strong>senha de app</strong> específica. A senha de app tem 16 caracteres sem espaços.</Tip>
      </div>
    ),
  },
  {
    id: "campaigns",
    icon: Megaphone,
    color: "text-purple-400 bg-purple-500/10",
    title: "Campanhas em massa",
    subtitle: "Envie a mesma mensagem para uma lista de contatos",
    readTime: "3 min",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Acesse <strong className="text-foreground">Campanhas</strong> no menu lateral para disparar uma mensagem
          (texto, imagem e enquete opcional) para vários contatos de uma vez. Funciona apenas com agentes conectados
          via <strong className="text-foreground">WhatsApp Evolution (QR Code)</strong> — o WhatsApp Oficial (Meta)
          exige um template de mensagem pré-aprovado para iniciar conversas em massa, então esse canal fica de fora por ora.
        </p>
        <Step n={1} title="Escreva a mensagem">Digite direto ou use o botão <strong className="text-foreground">Gerar com IA</strong> — ele usa o que você já escreveu (ou o nome da campanha) como base.</Step>
        <Step n={2} title="Imagem e enquete são opcionais">A imagem precisa ser um link direto de arquivo (.jpg/.png/.webp — não o link de uma página). A enquete chega como uma segunda mensagem, logo depois do texto/imagem, com até 3 opções para o cliente escolher.</Step>
        <Step n={3} title="Cole a lista de contatos">Um número por linha, em qualquer formato (a gente corrige DDD, traços, parênteses etc). Para número fora do Brasil, comece com <Code>+</Code> ou <Code>00</Code>.</Step>
        <Step n={4} title="Dispare e acompanhe ao vivo">Um painel mostra o envio número a número em tempo real. Todo número enviado com sucesso entra automaticamente na sua base de contatos, para reaproveitar em campanhas futuras.</Step>

        <Tip variant="warn">
          <strong>Funciona melhor com quem já falou com o bot antes.</strong> O WhatsApp bloqueia mensagens de números
          não-oficiais (como o QR Code) para contatos "frios" — pessoas que nunca trocaram mensagem com aquele número —
          como proteção contra spam. Isso aparece como <Code>erro 463</Code> no histórico da campanha e é uma limitação
          do próprio WhatsApp, não um problema da sua conta. Use campanhas para <strong className="text-foreground">reengajar
          clientes que já conversaram com o agente</strong> (ex: base de leads, clientes antigos); para alcançar gente
          totalmente nova, o caminho é o WhatsApp Oficial com mensagens de template aprovadas.
        </Tip>
        <Tip>Cada plano inclui uma cota mensal de disparos (Starter não inclui; Pro e Business incluem uma cota). O complemento <strong>Campanhas Extras</strong> soma +1.000 disparos/mês.</Tip>
      </div>
    ),
  },
  {
    id: "tags",
    icon: Tags,
    color: "text-teal-400 bg-teal-500/10",
    title: "Tags e Variáveis",
    subtitle: "Para integrações avançadas com automações externas",
    readTime: "2 min",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Seção opcional voltada para quem usa automações externas (n8n, Zapier, Make) com fluxos personalizados por contato ou segmento.
        </p>
        <Step n={1} title="Quando usar">Quando sua automação externa precisa receber dados específicos da conversa no payload JSON — ex: identificar de qual agente veio a mensagem, ou marcar o lead com tags para segmentação no seu CRM.</Step>
        <Step n={2} title="Como configurar">Na aba <strong className="text-foreground">Tags e Variáveis</strong> do agente, defina os marcadores e os valores correspondentes que devem ser incluídos no payload.</Step>
        <Tip>Se você não usa automações externas personalizadas, pode ignorar esta aba completamente — o agente funciona normalmente sem ela.</Tip>
      </div>
    ),
  },
  {
    id: "troubleshooting",
    icon: Wrench,
    color: "text-orange-400 bg-orange-500/10",
    title: "Solução de Problemas",
    subtitle: "Respostas para os problemas mais comuns",
    readTime: "3 min",
    content: (
      <div className="space-y-5">
        {[
          {
            title: "O agente não responde no WhatsApp",
            items: ["Verifique o status do canal na aba Canais — deve estar 'online'.", "Evolution API: confirme que o celular conectado está com internet e que não está usando o mesmo número no WhatsApp Web simultaneamente.", "Meta Oficial: verifique se o token de acesso não expirou. Tokens de System Users são permanentes; os outros expiram."],
          },
          {
            title: "O agente responde coisas erradas ou inventa informações",
            items: ["Adicione a informação correta na Base de Conhecimento.", "Revise a aba Personalidade e deixe explícito que o agente deve consultar a base antes de responder.", "Para dados que mudam com frequência (preços, disponibilidade), prefira Ferramentas/Webhooks para buscar em tempo real."],
          },
          {
            title: "As abas Conhecimento e Ferramentas estão bloqueadas",
            items: ["Salve o agente primeiro — essas abas só ficam disponíveis após o primeiro salvamento."],
          },
          {
            title: "Uma ferramenta (webhook) não está sendo chamada",
            items: ["Revise a descrição da ferramenta — precisa deixar claro o gatilho exato (quando chamar).", "Confirme que a URL responde corretamente a um POST de teste e devolve um JSON válido.", "Tente simular a conversa exatamente como o cliente faria, usando as palavras-chave do gatilho."],
          },
          {
            title: "O QR Code não conecta ou cai sozinho",
            items: ["QR Codes expiram após ~1 minuto — gere um novo e escaneie rapidamente.", "Evite usar o mesmo número de WhatsApp em outro celular ou no WhatsApp Web ao mesmo tempo.", "Se o celular ficar sem internet por tempo prolongado, a conexão cai — basta reconectar."],
          },
          {
            title: "Campanha mostra 'Falhou' com erro 463",
            items: ["É o WhatsApp bloqueando contato 'frio' (que nunca falou com esse número) — proteção anti-spam deles, não um erro do BizPilot.", "Funciona de forma confiável só com contatos que já trocaram mensagem com o agente antes.", "Para prospecção de gente nova, use o canal WhatsApp Oficial (Meta) com mensagem de template aprovada."],
          },
          {
            title: "O agente não envia áudio, imagem ou documento",
            items: ["Confirme que o módulo correspondente está ativado na aba Addons (Voz, Mídia).", "Para envio de arquivo, adicione o arquivo na aba Mídia do agente e instrua o agente a usar a ferramenta 'enviar_arquivo' no prompt."],
          },
        ].map(({ title, items }) => (
          <div key={title} className="space-y-1.5">
            <p className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" /> {title}
            </p>
            <ul className="space-y-1 pl-5">
              {items.map((item) => (
                <li key={item} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-muted-foreground/50 shrink-0">→</span> {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    ),
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  { id: "o-que-e", question: "O que é o BizPilot e o que ele faz na prática?", answer: <p>O BizPilot cria <strong>funcionários virtuais de IA</strong> que atendem seus clientes pelo WhatsApp 24 horas por dia. Cada agente pode tirar dúvidas, qualificar leads, agendar, enviar links de pagamento, consultar pedidos e executar ações personalizadas — tudo com base nas instruções, conhecimento e ferramentas que você configura.</p> },
  { id: "preciso-programar", question: "Preciso saber programar para usar o BizPilot?", answer: <p>Não para o uso básico. Criar agente, configurar personalidade, conectar WhatsApp e adicionar Base de Conhecimento são todos feitos por formulários, sem código. Programação só é necessária se você quiser criar <strong>Ferramentas (webhooks)</strong> personalizadas que se conectem ao seu próprio sistema.</p> },
  { id: "quantos-agentes", question: "Quantos agentes posso criar?", answer: <p>Depende do seu plano: <strong>Básico</strong> permite 1 agente, <strong>Profissional</strong> até 3, e <strong>Avançado</strong> ilimitados. Confira em <strong>Configurações → Plano</strong>.</p> },
  { id: "numero-pessoal", question: "Posso usar meu número de WhatsApp pessoal?", answer: <p>Sim. Usando a opção <strong>Evolution API (QR Code)</strong>, o agente conecta ao WhatsApp normal do mesmo jeito que o WhatsApp Web — sem custo de mensageria. O celular precisa ter internet ativa.</p> },
  { id: "desconectar", question: "O que acontece se o WhatsApp desconectar?", answer: <p>O status do canal muda para offline e o agente para de responder. Para reconectar: aba Canais → gerar novo QR Code → escanear. Nenhuma configuração é perdida.</p> },
  { id: "mudar-plano", question: "Como funciona a cobrança e posso mudar de plano?", answer: <div className="flex items-start gap-2"><CreditCard className="h-3.5 w-3.5 text-brand-400 shrink-0 mt-0.5" /><p>Assinatura mensal, cancelável a qualquer momento. Mude de plano em <strong>Configurações → Plano</strong>.</p></div> },
  { id: "seguranca-dados", question: "Meus dados e os dos meus clientes estão seguros?", answer: <div className="flex items-start gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><p>Sim. Dados por conta são isolados com controle de acesso. Conversas, agentes e base de conhecimento ficam restritos à sua conta.</p></div> },
  { id: "multiplos-clientes", question: "O agente atende vários clientes ao mesmo tempo?", answer: <p>Sim. Cada conversa é tratada de forma independente — o agente mantém contexto, histórico e memória separados por contato. Não há fila de espera.</p> },
  { id: "handoff", question: "Posso assumir a conversa manualmente?", answer: <p>Sim — é o <strong>Repasse (Handoff)</strong>. O agente identifica quando uma situação precisa de humano e transfere a conversa, ou você pode pausar o bot manualmente pelo painel de Conversas e assumir o atendimento.</p> },
  { id: "outros-idiomas", question: "O agente funciona em outros idiomas?", answer: <p>Sim. O modelo de IA entende e responde em diversos idiomas. Para usar outro idioma como padrão, escreva a personalidade e as instruções nesse idioma.</p> },
  { id: "limite-mensagens", question: "Existe limite de mensagens por mês?", answer: <p>Respostas em <strong>texto são ilimitadas</strong> em todos os planos. O que varia entre planos é o número de agentes, recursos disponíveis (voz, memória, ferramentas) e canais simultâneos.</p> },
  { id: "cancelar", question: "Como cancelo minha assinatura?", answer: <p>Acesse <strong>Configurações → Plano</strong> e siga as instruções de cancelamento. Agentes e dados continuam acessíveis durante o período pago.</p> },
  { id: "rag-explicacao", question: "O que é exatamente a Base de Conhecimento (RAG)?", answer: <p>RAG significa "Retrieval-Augmented Generation". Na prática: o agente "consulta" documentos do seu negócio antes de responder, em vez de depender só do que está no prompt. Mais preciso, mais atualizado, mais confiável.</p> },
  { id: "integrar-sistemas", question: "Posso integrar com meu ERP, CRM ou sistema de pedidos?", answer: <div className="flex items-start gap-2"><Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" /><p>Sim, através de <strong>Ferramentas (Webhooks)</strong>. Cadastre um endpoint do seu sistema (ou de uma automação no n8n, Zapier, Make) e a IA decide sozinha quando chamar durante a conversa.</p></div> },
  { id: "grava-conversas", question: "O agente grava o histórico das conversas?", answer: <p>Sim. O histórico é salvo por conversa para que o agente tenha contexto e para que você possa acompanhar o atendimento no painel de Conversas.</p> },
  { id: "diferenca-planos", question: "Qual a diferença prática entre os planos?", answer: <p><strong>Básico</strong>: 1 agente, texto. <strong>Profissional</strong>: até 3 agentes + voz + memória de longo prazo + ferramentas. <strong>Avançado</strong>: ilimitado + todos os recursos + calendário e redes sociais. Veja a comparação completa em <strong>Configurações → Plano</strong>.</p> },
];

export const CATEGORIES: Category[] = [
  { id: "inicio", label: "Primeiros Passos", icon: Sparkles, sectionIds: ["overview", "agent"], description: "Entenda como o sistema funciona e configure seu primeiro agente." },
  { id: "canais", label: "Canais", icon: Smartphone, sectionIds: ["whatsapp"], description: "Conecte o WhatsApp via QR Code ou Meta Oficial." },
  { id: "inteligencia", label: "Inteligência", icon: Brain, sectionIds: ["knowledge", "tools", "memory", "audio"], description: "Base de conhecimento, ferramentas, memória e áudio." },
  { id: "integracoes", label: "Integrações", icon: Zap, sectionIds: ["email"], description: "E-mail, automações e sistemas externos." },
  { id: "campanhas", label: "Campanhas", icon: Megaphone, sectionIds: ["campaigns"], description: "Disparo em massa via WhatsApp, com enquete e base de contatos." },
  { id: "avancado", label: "Avançado", icon: Tags, sectionIds: ["tags"], description: "Tags, variáveis e configurações para usuários avançados." },
  { id: "problemas", label: "Problemas", icon: Wrench, sectionIds: ["troubleshooting"], description: "Diagnóstico e solução dos erros mais comuns." },
  { id: "faq", label: "FAQ", icon: HelpCircle, sectionIds: [], description: "Perguntas frequentes respondidas de forma direta." },
];
