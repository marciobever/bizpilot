import React from "react";
import {
  Smartphone, Bot, Brain, Webhook, Mic, Tags, Wrench, Sparkles, AlertTriangle,
  MessageSquare, CreditCard, ShieldCheck, Lightbulb, HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Step, Code, Tip } from "../_components/HelpComponents";

export type Section = {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: React.ReactNode;
};

export type Category = {
  id: string;
  label: string;
  icon: React.ElementType;
  sectionIds: string[];
};

export const SECTIONS: Section[] = [
  {
    id: "overview",
    icon: Sparkles,
    color: "text-brand-500 bg-brand-500/10",
    title: "Visão geral: como tudo se conecta",
    subtitle: "Entenda o fluxo completo antes de configurar",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">O BizPilot funciona em 3 camadas que trabalham juntas para cada agente que você cria:</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="p-3 border border-border rounded-lg bg-secondary/10">
            <Smartphone className="h-4 w-4 text-emerald-500 mb-2" />
            <p className="text-sm font-medium">1. Canal (WhatsApp)</p>
            <p className="text-xs text-muted-foreground mt-1">Recebe e envia mensagens via Evolution API (QR Code) ou Meta Oficial (Cloud API).</p>
          </div>
          <div className="p-3 border border-border rounded-lg bg-secondary/10">
            <Bot className="h-4 w-4 text-purple-500 mb-2" />
            <p className="text-sm font-medium">2. Agente (Cérebro)</p>
            <p className="text-xs text-muted-foreground mt-1">Persona, instruções, modelo de IA, voz. Tudo configurado na tela do agente.</p>
          </div>
          <div className="p-3 border border-border rounded-lg bg-secondary/10">
            <Brain className="h-4 w-4 text-amber-500 mb-2" />
            <p className="text-sm font-medium">3. Inteligência</p>
            <p className="text-xs text-muted-foreground mt-1">Conhecimento (RAG), Ferramentas (ações) e Memória de longo prazo do cliente.</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">Quando alguém manda mensagem no WhatsApp conectado a um agente, o sistema: (1) transcreve áudios automaticamente, (2) espera alguns segundos para juntar mensagens picadas, (3) busca o histórico, memórias salvas e conhecimento relevante, (4) chama ferramentas se precisar (ex: agendar, consultar API), (5) responde — em texto ou áudio, dependendo de como o cliente mandou.</p>
        <Tip>Recomendado seguir esta ordem: <strong>1) Criar o agente</strong> → <strong>2) Conectar o WhatsApp</strong> → <strong>3) Adicionar conhecimento</strong> → <strong>4) Configurar ferramentas</strong> (opcional).</Tip>
      </div>
    ),
  },
  {
    id: "agent",
    icon: Bot,
    color: "text-purple-500 bg-purple-500/10",
    title: "Configurar o Agente",
    subtitle: "Identidade, personalidade, instruções, modelo de IA e voz",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">A tela do agente é dividida em abas. Veja o que configurar em cada uma:</p>
        <Step n={1} title="Identidade">Dê um nome claro e escolha o tipo (vendas, suporte, agendamento, etc.) — isso ajuda a organizar quando você tiver vários agentes.</Step>
        <Step n={2} title="Personalidade">Escreva como o agente deve agir: tom de voz, o que ele pode e não pode fazer, e informações gerais da empresa. Detalhes que mudam com frequência (preços, FAQs longas) devem ir na <strong>Base de Conhecimento</strong>.</Step>
        <Step n={3} title="Configurações">Escolha o modelo de IA e ative ou desative recursos como resposta em áudio.</Step>
        <Step n={4} title="Addons">Ative integrações extras para o agente, como ferramentas (ações/webhooks) e outros módulos disponíveis no seu plano.</Step>
        <Step n={5} title="Personalizada">Espaço livre para instruções específicas do seu negócio — use com moderação, priorizando a Base de Conhecimento para conteúdo extenso.</Step>
        <Step n={6} title="Salvar">Clique em <strong>Salvar</strong>. Só depois disso as abas Canais, Conhecimento e Ferramentas ficam disponíveis.</Step>
        <Tip>Se o seu segmento não aparece nos modelos prontos, use a opção "Outro" para descrever em texto livre o que você espera do agente.</Tip>
      </div>
    ),
  },
  {
    id: "whatsapp",
    icon: Smartphone,
    color: "text-emerald-500 bg-emerald-500/10",
    title: "Conectar o WhatsApp",
    subtitle: "Evolution API (QR Code, grátis) ou Meta Oficial (Cloud API)",
    content: (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground leading-relaxed">Você pode conectar o WhatsApp do agente de duas formas. Escolha a opção na aba <strong>Canais</strong> do agente.</p>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Opção 1 · Recomendada</Badge>
            <span className="text-sm font-medium">Evolution API (QR Code)</span>
          </div>
          <div className="space-y-3 pl-1">
            <Step n={1} title="Salve o agente primeiro">Antes de conectar qualquer canal, clique em <strong>Salvar</strong> na tela do agente.</Step>
            <Step n={2} title="Vá até a aba Canais">Clique em <strong>Conectar WhatsApp</strong>.</Step>
            <Step n={3} title="Escaneie o QR Code">Abra o WhatsApp no celular → <strong>Configurações → Aparelhos conectados → Conectar um aparelho</strong> → aponte a câmera para o QR Code.</Step>
            <Step n={4} title="Aguarde a confirmação">O status muda automaticamente para <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[10px] h-4">online</Badge> assim que conectar.</Step>
          </div>
          <Tip>Essa opção usa o número de WhatsApp normal (pessoal ou Business), sem custo de mensageria. O celular precisa ficar com internet.</Tip>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-brand-500 border-brand-500/30">Opção 2</Badge>
            <span className="text-sm font-medium">Meta Oficial (WhatsApp Cloud API)</span>
          </div>
          <div className="space-y-3 pl-1">
            <Step n={1} title="Crie um app no Meta for Developers">Acesse <Code>developers.facebook.com</Code> → crie um app do tipo <strong>Business</strong> → adicione o produto <strong>WhatsApp</strong>.</Step>
            <Step n={2} title="Pegue as credenciais"><strong>Phone Number ID</strong>, <strong>WABA ID</strong> e o <strong>Token de Acesso</strong> (gere um token permanente em System Users).</Step>
            <Step n={3} title="Cole na aba Canais do agente">Selecione <strong>Meta Oficial</strong>, cole as três credenciais e salve.</Step>
            <Step n={4} title="Configure o Webhook no Meta">Em <strong>Webhooks</strong>, aponte para a URL de webhook exibida na tela do agente e use o <strong>Verify Token</strong> mostrado ali. Selecione o campo <Code>messages</Code>.</Step>
          </div>
          <Tip variant="warn">A Meta só permite responder livremente dentro de uma janela de 24h após a última mensagem do cliente.</Tip>
        </div>
      </div>
    ),
  },
  {
    id: "knowledge",
    icon: Brain,
    color: "text-amber-500 bg-amber-500/10",
    title: "Base de Conhecimento (RAG)",
    subtitle: "Ensine o agente sobre seu negócio com textos e links",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">A Base de Conhecimento permite que o agente "consulte" informações específicas do seu negócio antes de responder — sem precisar lotar o prompt principal. Tudo fica na aba <strong>Conhecimento</strong> do agente.</p>
        <Step n={1} title="Clique em 'Adicionar'">Escolha entre <strong>Texto</strong> (cole o conteúdo direto) ou <strong>URL</strong> (o sistema acessa a página e extrai o texto automaticamente).</Step>
        <Step n={2} title="Dê um título descritivo">Ex: "Tabela de Preços 2026", "FAQ - Dúvidas Frequentes", "Política de Trocas".</Step>
        <Step n={3} title="Cole o conteúdo">Para texto: cole listas de preços, descrições de serviços, perguntas frequentes, políticas, horários. Para URL: use links de páginas públicas.</Step>
        <Step n={4} title="Salvar e Vetorizar">O sistema divide o texto em pedaços (chunks) e gera embeddings — uma representação matemática do significado do texto.</Step>
        <Step n={5} title="Pronto — é automático">Sempre que o cliente perguntar algo, o agente busca automaticamente nos chunks salvos e usa o trecho mais relevante para responder.</Step>
        <Tip>Prefira textos curtos e organizados por assunto (um documento por tema). Fica mais fácil de manter atualizado e a busca fica mais precisa.</Tip>
        <Tip variant="warn">Para atualizar uma informação, apague a entrada antiga e adicione a versão nova — o conteúdo não pode ser editado depois de salvo.</Tip>
      </div>
    ),
  },
  {
    id: "tools",
    icon: Webhook,
    color: "text-rose-500 bg-rose-500/10",
    title: "Ferramentas / Ações (Webhooks)",
    subtitle: "Permita que o agente execute ações reais (agendar, consultar, etc.)",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">Ferramentas conectam o agente a sistemas externos. Quando configurada, a IA decide sozinha quando chamar a ferramenta durante a conversa.</p>
        <Step n={1} title="Vá até a aba Ferramentas e clique em 'Nova Ferramenta'">Cada ferramenta representa uma ação que o agente pode executar.</Step>
        <Step n={2} title="Nome">Use um nome curto, sem espaços. Ex: <Code>agendar_consulta</Code>, <Code>consultar_pedido</Code>.</Step>
        <Step n={3} title="Descrição (a parte mais importante!)">Explique <strong>quando</strong> a IA deve usar essa ferramenta e <strong>o que ela faz</strong>. A IA lê essa descrição para decidir se e quando chamar.</Step>
        <Step n={4} title="Método e URL">Informe a URL do seu endpoint (n8n, Zapier, sua própria API, etc.) e o método HTTP (geralmente <Code>POST</Code>).</Step>
        <Step n={5} title="Headers (opcional)">Se o endpoint precisar de autenticação, adicione o header necessário: <Code>Authorization: Bearer SEU_TOKEN</Code>.</Step>
        <Step n={6} title="Parâmetros">Liste as informações que a IA deve enviar, com uma descrição curta de cada uma. A IA preenche os valores automaticamente com base na conversa.</Step>
        <Step n={7} title="Como sua URL deve responder">Seu endpoint recebe um JSON via POST e deve devolver um <strong>JSON</strong> com o resultado. A IA lê essa resposta e formula a mensagem para o cliente.</Step>
        <Tip>Comece com poucas ferramentas, bem descritas. Descrições vagas fazem a IA usar a ferramenta no momento errado.</Tip>
      </div>
    ),
  },
  {
    id: "memory",
    icon: MessageSquare,
    color: "text-sky-500 bg-sky-500/10",
    title: "Memória de Longo Prazo",
    subtitle: "O agente lembra de cada cliente entre conversas — automático",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">Não há nada para configurar aqui — funciona sozinho. Após cada conversa, o agente identifica fatos relevantes sobre o contato e guarda para usar nas próximas conversas.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="p-3 border border-border rounded-lg bg-secondary/10">
            <p className="text-sm font-medium mb-1">Exemplos do que é lembrado</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>"Cliente prefere atendimento à tarde"</li>
              <li>"Já comprou o plano Premium em 2025"</li>
              <li>"Tem dois cães, um Golden e um Poodle"</li>
              <li>"Mora no bairro Centro"</li>
            </ul>
          </div>
          <div className="p-3 border border-border rounded-lg bg-secondary/10">
            <p className="text-sm font-medium mb-1">Como isso ajuda</p>
            <p className="text-xs text-muted-foreground">Na próxima conversa, o agente já "lembra" desses detalhes e personaliza a resposta — sem o cliente precisar repetir informações.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "audio",
    icon: Mic,
    color: "text-fuchsia-500 bg-fuchsia-500/10",
    title: "Áudios e Mensagens",
    subtitle: "Transcrição automática e resposta no mesmo formato",
    content: (
      <div className="space-y-3">
        <Step n={1} title="Cliente manda áudio">O sistema baixa o áudio, transcreve automaticamente e processa o texto normalmente.</Step>
        <Step n={2} title="Resposta em áudio (opcional)">Se a opção <strong>"Responder em áudio"</strong> estiver ativada no agente, e o cliente tiver mandado áudio, a resposta também será enviada como áudio.</Step>
        <Step n={3} title="Mensagens picadas (debounce)">Se o cliente mandar várias mensagens curtas seguidas, o sistema espera alguns segundos e junta tudo em uma única mensagem antes de responder.</Step>
        <Tip variant="warn">Áudios muito longos (acima de alguns minutos) podem demorar mais para transcrever.</Tip>
      </div>
    ),
  },
  {
    id: "tags",
    icon: Tags,
    color: "text-teal-500 bg-teal-500/10",
    title: "Tags e Variáveis (Automação Externa)",
    subtitle: "Para integrações avançadas com automações externas",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">Esta seção é opcional e voltada para quem usa automações externas para fluxos personalizados.</p>
        <Step n={1} title="Quando usar">Use se você precisa que dados específicos da conversa sejam enviados junto no payload JSON para a sua automação externa.</Step>
        <Step n={2} title="Como configurar">Na aba <strong>Tags e Variáveis</strong> do agente, defina os marcadores e os valores/variáveis correspondentes.</Step>
        <Tip>Se você não usa automações personalizadas, pode ignorar esta aba — o agente funciona normalmente sem ela.</Tip>
      </div>
    ),
  },
  {
    id: "troubleshooting",
    icon: Wrench,
    color: "text-orange-500 bg-orange-500/10",
    title: "Solução de Problemas",
    subtitle: "Respostas para os problemas mais comuns",
    content: (
      <div className="space-y-4">
        {[
          { title: "O agente não responde no WhatsApp", items: ["Verifique se o status do canal está online na aba Canais.", "Se usar Evolution API, confirme que o celular conectado está com internet.", "Se usar Meta Oficial, confira se o token de acesso não expirou."] },
          { title: "O agente não sabe responder sobre algo do meu negócio", items: ["Adicione essa informação na Base de Conhecimento (aba Conhecimento).", "Para regras de comportamento gerais, ajuste o prompt na aba Personalidade."] },
          { title: "As abas Conhecimento e Ferramentas estão bloqueadas", items: ["Salve o agente primeiro — essas abas só funcionam após o agente existir no banco de dados."] },
          { title: "Uma ferramenta (webhook) não está sendo chamada", items: ["Revise a descrição da ferramenta — ela precisa deixar claro quando usá-la.", "Confirme que a URL responde corretamente a um POST de teste e devolve um JSON válido."] },
          { title: "O QR Code não conecta ou cai sozinho", items: ["Gere um novo QR Code na aba Canais e escaneie novamente — QR Codes expiram após alguns minutos.", "Evite usar o mesmo número de WhatsApp em outro celular ou no WhatsApp Web ao mesmo tempo."] },
        ].map(({ title, items }) => (
          <div key={title}>
            <p className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> {title}</p>
            <ul className="text-xs text-muted-foreground mt-1.5 space-y-1 list-disc pl-5">
              {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    ),
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  { id: "o-que-e", question: "O que é o BizPilot e o que ele faz na prática?", answer: <p>O BizPilot cria <strong>funcionários virtuais de IA</strong> que atendem seus clientes pelo WhatsApp 24 horas por dia. Cada agente pode tirar dúvidas, qualificar leads, agendar horários, enviar links de pagamento, consultar pedidos e executar outras ações — tudo com base nas instruções, conhecimento e ferramentas que você configura.</p> },
  { id: "preciso-programar", question: "Preciso saber programar para usar?", answer: <p>Não para o uso básico. Criar o agente, escrever a personalidade, conectar o WhatsApp e adicionar a Base de Conhecimento é tudo feito por formulários, sem código. Programação só é necessária se você quiser criar <strong>Ferramentas (webhooks)</strong> personalizadas.</p> },
  { id: "quantos-agentes", question: "Quantos agentes posso criar?", answer: <p>Depende do seu plano: o <strong>Básico</strong> permite 1 agente, o <strong>Profissional</strong> até 3 agentes, e o <strong>Avançado</strong> permite agentes ilimitados. Você pode ver os detalhes em <strong>Configurações → Plano</strong>.</p> },
  { id: "numero-pessoal", question: "Posso usar meu número de WhatsApp pessoal?", answer: <p>Sim. Usando a opção <strong>Evolution API (QR Code)</strong>, o agente se conecta ao seu WhatsApp normal do mesmo jeito que o WhatsApp Web funciona — sem custo de mensageria.</p> },
  { id: "desconectar", question: "O que acontece se o WhatsApp desconectar?", answer: <p>O status do canal muda para offline e o agente para de responder até a conexão ser restabelecida. Basta gerar um novo QR Code e escanear de novo. Nenhuma configuração do agente é perdida.</p> },
  { id: "mudar-plano", question: "Como funciona a cobrança e posso mudar de plano?", answer: <div className="flex items-start gap-2"><CreditCard className="h-3.5 w-3.5 text-brand-400 shrink-0 mt-0.5" /><p>A assinatura é mensal e pode ser alterada a qualquer momento em <strong>Configurações → Plano</strong>.</p></div> },
  { id: "seguranca-dados", question: "Meus dados e os dados dos meus clientes estão seguros?", answer: <div className="flex items-start gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><p>Sim. Os dados da sua conta, agentes, conversas e base de conhecimento são armazenados de forma isolada por conta, com controle de acesso.</p></div> },
  { id: "multiplos-clientes", question: "O agente consegue atender vários clientes ao mesmo tempo?", answer: <p>Sim. Cada conversa é tratada de forma independente — o agente mantém o contexto, histórico e memória separados por contato.</p> },
  { id: "handoff", question: "Posso assumir a conversa manualmente quando quiser?", answer: <p>Sim — esse recurso é chamado de <strong>Repasse (Handoff)</strong>. O agente pode identificar quando uma situação precisa de um humano e transferir a conversa, ou você pode assumir manualmente pelo painel.</p> },
  { id: "outros-idiomas", question: "O agente funciona em outros idiomas além do português?", answer: <p>Sim. O modelo de IA entende e responde em diversos idiomas. Basta escrever a personalidade/instruções no idioma desejado.</p> },
  { id: "limite-mensagens", question: "Existe limite de mensagens por mês?", answer: <p>As respostas em <strong>texto são ilimitadas</strong> em todos os planos. O que varia entre planos é o número de agentes, canais simultâneos e recursos extras.</p> },
  { id: "cancelar", question: "Como cancelo minha assinatura?", answer: <p>Acesse <strong>Configurações → Plano</strong> e siga as instruções de cancelamento. Seus agentes e dados continuam acessíveis durante o período já pago.</p> },
  { id: "rag-explicacao", question: "O que é exatamente a 'Base de Conhecimento (RAG)'?", answer: <p>RAG significa "Retrieval-Augmented Generation" — na prática, é uma forma de o agente "consultar" documentos específicos do seu negócio antes de responder, em vez de depender só do que está escrito no prompt principal.</p> },
  { id: "integrar-sistemas", question: "Posso integrar o agente com meu ERP, CRM ou sistema de pedidos?", answer: <div className="flex items-start gap-2"><Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" /><p>Sim, através de <strong>Ferramentas (Webhooks)</strong>. Você cadastra um endpoint do seu sistema (ou de uma automação no n8n, Zapier, etc.) e a IA decide sozinha quando chamar essa ferramenta durante a conversa.</p></div> },
  { id: "grava-conversas", question: "O agente grava ou tem acesso ao histórico das conversas?", answer: <p>Sim, o histórico de cada conversa é salvo para que o agente tenha contexto e para que você possa acompanhar o atendimento pelo painel.</p> },
];

export const CATEGORIES: Category[] = [
  { id: "inicio", label: "Primeiros Passos", icon: Sparkles, sectionIds: ["overview", "agent"] },
  { id: "canais", label: "Canais (WhatsApp)", icon: Smartphone, sectionIds: ["whatsapp"] },
  { id: "inteligencia", label: "Inteligência do Agente", icon: Brain, sectionIds: ["knowledge", "tools", "memory", "audio"] },
  { id: "avancado", label: "Avançado", icon: Tags, sectionIds: ["tags"] },
  { id: "problemas", label: "Solução de Problemas", icon: Wrench, sectionIds: ["troubleshooting"] },
  { id: "faq", label: "Perguntas Frequentes", icon: HelpCircle, sectionIds: [] },
];
