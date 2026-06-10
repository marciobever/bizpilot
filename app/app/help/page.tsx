"use client";
import React, { useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  Smartphone,
  Bot,
  Brain,
  Webhook,
  Mic,
  Tags,
  Wrench,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type Section = {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono break-all">{children}</code>;
}

function Tip({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warn" }) {
  return (
    <div className={cn(
      "flex gap-2 items-start p-3 rounded-lg border text-xs leading-relaxed",
      variant === "info" ? "bg-indigo-500/5 border-indigo-500/20 text-indigo-300" : "bg-amber-500/5 border-amber-500/20 text-amber-300"
    )}>
      {variant === "info" ? <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
      <div>{children}</div>
    </div>
  );
}

const SECTIONS: Section[] = [
  {
    id: "overview",
    icon: Sparkles,
    color: "text-indigo-500 bg-indigo-500/10",
    title: "Visão geral: como tudo se conecta",
    subtitle: "Entenda o fluxo completo antes de configurar",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          O Synapse AI funciona em 3 camadas que trabalham juntas para cada agente que você cria:
        </p>
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
        <p className="text-sm text-muted-foreground leading-relaxed">
          Quando alguém manda mensagem no WhatsApp conectado a um agente, o sistema: (1) transcreve áudios automaticamente,
          (2) espera alguns segundos para juntar mensagens picadas, (3) busca o histórico, memórias salvas e conhecimento relevante,
          (4) chama ferramentas se precisar (ex: agendar, consultar API), (5) responde — em texto ou áudio, dependendo de como o
          cliente mandou.
        </p>
        <Tip>
          Recomendado seguir esta ordem: <strong>1) Criar o agente</strong> → <strong>2) Conectar o WhatsApp</strong> →
          <strong> 3) Adicionar conhecimento</strong> → <strong>4) Configurar ferramentas</strong> (opcional).
        </Tip>
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
        <p className="text-sm text-muted-foreground leading-relaxed">
          Você pode conectar o WhatsApp do agente de duas formas. Escolha a opção na aba <strong>Canais</strong> do agente.
        </p>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Opção 1 · Recomendada</Badge>
            <span className="text-sm font-medium">Evolution API (QR Code)</span>
          </div>
          <div className="space-y-3 pl-1">
            <Step n={1} title="Salve o agente primeiro">
              Antes de conectar qualquer canal, clique em <strong>Salvar</strong> na tela do agente. A conexão precisa do ID do agente já existir.
            </Step>
            <Step n={2} title="Vá até a aba Canais">
              Clique em <strong>Conectar WhatsApp</strong>. Se quiser usar um nome próprio para a instância (caso tenha mais de um número), preencha o campo opcional.
            </Step>
            <Step n={3} title="Escaneie o QR Code">
              Abra o WhatsApp no celular → <strong>Configurações → Aparelhos conectados → Conectar um aparelho</strong> → aponte a câmera para o QR Code exibido na tela.
            </Step>
            <Step n={4} title="Aguarde a confirmação">
              O status muda automaticamente para <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[10px] h-4">online</Badge> assim que o WhatsApp conectar. Isso pode levar até 30 segundos.
            </Step>
          </div>
          <Tip>
            Essa opção usa o número de WhatsApp normal (pessoal ou Business) do seu celular, sem custo de mensageria. O celular precisa ficar com internet — se ficar muito tempo offline, pode ser necessário reconectar.
          </Tip>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-indigo-500 border-indigo-500/30">Opção 2</Badge>
            <span className="text-sm font-medium">Meta Oficial (WhatsApp Cloud API)</span>
          </div>
          <div className="space-y-3 pl-1">
            <Step n={1} title="Crie um app no Meta for Developers">
              Acesse <Code>developers.facebook.com</Code> → crie um app do tipo <strong>Business</strong> → adicione o produto <strong>WhatsApp</strong>.
            </Step>
            <Step n={2} title="Pegue as credenciais">
              No painel do produto WhatsApp você vai encontrar: <strong>Phone Number ID</strong>, <strong>WhatsApp Business Account ID (WABA ID)</strong> e o <strong>Token de Acesso</strong> (gere um token permanente em System Users).
            </Step>
            <Step n={3} title="Cole na aba Canais do agente">
              Selecione <strong>Meta Oficial</strong>, cole as três credenciais e salve.
            </Step>
            <Step n={4} title="Configure o Webhook no Meta">
              No painel do app Meta, em <strong>Webhooks</strong>, aponte para a URL de webhook exibida na tela do agente e use o <strong>Verify Token</strong> mostrado ali. Selecione o campo <Code>messages</Code> para inscrição.
            </Step>
          </div>
          <Tip variant="warn">
            A Meta só permite responder livremente dentro de uma janela de 24h após a última mensagem do cliente. Fora desse prazo, é necessário um <strong>template aprovado</strong> para iniciar a conversa.
          </Tip>
        </div>
      </div>
    ),
  },
  {
    id: "agent",
    icon: Bot,
    color: "text-purple-500 bg-purple-500/10",
    title: "Configurar o Agente",
    subtitle: "Persona, instruções, modelo de IA e voz",
    content: (
      <div className="space-y-3">
        <Step n={1} title="Nome e tipo do agente">
          Dê um nome claro (ex: "Recepção - Clínica X") e escolha o tipo (vendas, suporte, agendamento, etc.) — isso ajuda a organizar quando você tiver vários agentes.
        </Step>
        <Step n={2} title="Persona / Instruções (Prompt)">
          Na aba <strong>Comportamento</strong>, escreva como o agente deve agir: tom de voz, o que pode e não pode fazer, informações da empresa
          (horários, endereço, serviços, preços). Quanto mais específico, melhor — mas detalhes que mudam com frequência (preços, FAQs longas)
          devem ir na <strong>Base de Conhecimento</strong> em vez do prompt.
        </Step>
        <Step n={3} title="Modelo de IA">
          O modelo padrão (<Code>gpt-5.4-mini</Code>) já é rápido e inteligente o suficiente para a maioria dos casos. Não é necessário trocar.
        </Step>
        <Step n={4} title="Voz / Resposta em áudio">
          Ative <strong>"Responder em áudio"</strong> se quiser que o agente converta a resposta em áudio quando o cliente também mandar áudio
          (resposta "no mesmo formato"). Se o cliente mandar texto, o agente sempre responde em texto.
        </Step>
        <Step n={5} title="Salvar">
          Clique em <strong>Salvar</strong>. Só depois disso as abas Canais, Conhecimento e Ferramentas ficam disponíveis (elas dependem do agente já existir no banco).
        </Step>
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
        <p className="text-sm text-muted-foreground leading-relaxed">
          A Base de Conhecimento permite que o agente "consulte" informações específicas do seu negócio antes de responder —
          sem precisar lotar o prompt principal. Tudo fica na aba <strong>Conhecimento</strong> do agente.
        </p>
        <Step n={1} title="Clique em 'Adicionar'">
          Escolha entre <strong>Texto</strong> (cole o conteúdo direto) ou <strong>URL</strong> (o sistema acessa a página e extrai o texto automaticamente).
        </Step>
        <Step n={2} title="Dê um título descritivo">
          Ex: "Tabela de Preços 2026", "FAQ - Dúvidas Frequentes", "Política de Trocas". O título ajuda só na sua organização.
        </Step>
        <Step n={3} title="Cole o conteúdo">
          Para texto: cole listas de preços, descrições de serviços, perguntas frequentes, políticas, horários — qualquer coisa que o cliente possa perguntar.
          Para URL: use links de páginas públicas (ex: página "Sobre" ou "FAQ" do seu site).
        </Step>
        <Step n={4} title="Salvar e Vetorizar">
          O sistema divide o texto em pedaços (chunks) e gera "embeddings" — uma representação matemática do significado do texto.
          Isso permite que o agente encontre o trecho certo mesmo que o cliente pergunte com outras palavras.
        </Step>
        <Step n={5} title="Pronto — é automático">
          Você não precisa fazer mais nada. Sempre que o cliente perguntar algo, o agente busca automaticamente nos chunks salvos
          e usa o trecho mais relevante para responder.
        </Step>
        <Tip>
          Prefira textos curtos e organizados por assunto (um documento por tema) em vez de um único texto gigante. Fica mais fácil de manter atualizado e a busca fica mais precisa.
        </Tip>
        <Tip variant="warn">
          Para remover ou atualizar uma informação, apague a entrada antiga (botão de lixeira) e adicione a versão nova — o conteúdo de uma entrada não pode ser editado depois de salvo.
        </Tip>
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
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ferramentas conectam o agente a sistemas externos. Quando configurada, a IA decide sozinha quando chamar a ferramenta
          durante a conversa — por exemplo, para consultar disponibilidade de horários ou registrar um pedido.
        </p>
        <Step n={1} title="Vá até a aba Ferramentas e clique em 'Nova Ferramenta'">
          Cada ferramenta representa uma ação que o agente pode executar.
        </Step>
        <Step n={2} title="Nome">
          Use um nome curto, sem espaços e em minúsculas, que descreva a ação. Ex: <Code>agendar_consulta</Code>, <Code>consultar_pedido</Code>, <Code>buscar_disponibilidade</Code>.
        </Step>
        <Step n={3} title="Descrição (a parte mais importante!)">
          Explique <strong>quando</strong> a IA deve usar essa ferramenta e <strong>o que ela faz</strong>. Ex: "Use esta ferramenta quando o cliente quiser
          marcar um horário. Retorna os horários disponíveis para a data informada." A IA lê essa descrição para decidir se e quando chamar.
        </Step>
        <Step n={4} title="Método e URL">
          Informe a URL do seu endpoint (Windmill, n8n, Zapier, sua própria API, etc.) e o método HTTP (geralmente <Code>POST</Code>).
        </Step>
        <Step n={5} title="Headers (opcional)">
          Se o endpoint precisar de autenticação, adicione o header necessário, ex: <Code>Authorization: Bearer SEU_TOKEN</Code>.
        </Step>
        <Step n={6} title="Parâmetros">
          Liste as informações que a IA deve enviar para essa ferramenta, com uma descrição curta de cada uma. Ex: parâmetro <Code>data</Code>
          com descrição "Data desejada no formato AAAA-MM-DD". A IA preenche esses valores automaticamente com base na conversa.
        </Step>
        <Step n={7} title="Como sua URL deve responder">
          Seu endpoint recebe um JSON via POST com os parâmetros preenchidos pela IA e deve devolver um <strong>JSON</strong> com o resultado
          (ex: lista de horários, confirmação, dados do pedido). A IA lê essa resposta e formula a mensagem para o cliente.
        </Step>
        <Tip>
          Comece com poucas ferramentas, bem descritas. Descrições vagas ("gerencia agendamentos") fazem a IA usar a ferramenta
          no momento errado ou nunca usar.
        </Tip>
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
        <p className="text-sm text-muted-foreground leading-relaxed">
          Não há nada para configurar aqui — funciona sozinho. Após cada conversa, o agente identifica fatos relevantes sobre
          o contato (nome, preferências, histórico, dados mencionados) e guarda para usar nas próximas conversas.
        </p>
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
            <p className="text-xs text-muted-foreground">
              Na próxima conversa, o agente já "lembra" desses detalhes e personaliza a resposta — sem o cliente precisar repetir
              informações.
            </p>
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
        <Step n={1} title="Cliente manda áudio">
          O sistema baixa o áudio, transcreve automaticamente (usando reconhecimento de voz) e processa o texto normalmente.
        </Step>
        <Step n={2} title="Resposta em áudio (opcional)">
          Se a opção <strong>"Responder em áudio"</strong> estiver ativada no agente, e o cliente tiver mandado áudio, a resposta também
          será enviada como áudio. Se o cliente mandar texto, a resposta é sempre em texto — mesmo com a opção ativada.
        </Step>
        <Step n={3} title="Mensagens picadas (debounce)">
          Se o cliente mandar várias mensagens curtas seguidas (ex: "Oi", "tudo bem?", "queria saber sobre o plano"), o sistema espera
          alguns segundos e junta tudo em uma única mensagem antes de responder — evitando respostas picadas ou fora de contexto.
        </Step>
        <Tip variant="warn">
          Áudios muito longos (acima de alguns minutos) podem demorar mais para transcrever. Para perguntas rápidas, o ideal é texto.
        </Tip>
      </div>
    ),
  },
  {
    id: "tags",
    icon: Tags,
    color: "text-teal-500 bg-teal-500/10",
    title: "Tags e Variáveis (Windmill)",
    subtitle: "Para integrações avançadas com automações externas",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Esta seção é opcional e voltada para quem já usa (ou vai usar) automações no Windmill para fluxos personalizados — por exemplo,
          disparar um fluxo diferente dependendo de uma tag definida na conversa.
        </p>
        <Step n={1} title="Quando usar">
          Use se você precisa que dados específicos da conversa (tags, identificadores, status) sejam enviados junto no payload JSON
          para a sua automação no Windmill.
        </Step>
        <Step n={2} title="Como configurar">
          Na aba <strong>Tags e Variáveis</strong> do agente, defina os marcadores e os valores/variáveis correspondentes. Eles serão
          incluídos automaticamente no payload enviado ao seu fluxo.
        </Step>
        <Tip>
          Se você não usa automações personalizadas no Windmill, pode ignorar esta aba — o agente funciona normalmente sem ela.
        </Tip>
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
        <div>
          <p className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> O agente não responde no WhatsApp</p>
          <ul className="text-xs text-muted-foreground mt-1.5 space-y-1 list-disc pl-5">
            <li>Verifique se o status do canal está <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[10px] h-4">online</Badge> na aba Canais.</li>
            <li>Se usar Evolution API, confirme que o celular conectado está com internet.</li>
            <li>Se usar Meta Oficial, confira se o token de acesso não expirou.</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> O agente não sabe responder sobre algo do meu negócio</p>
          <ul className="text-xs text-muted-foreground mt-1.5 space-y-1 list-disc pl-5">
            <li>Adicione essa informação na <strong>Base de Conhecimento</strong> (aba Conhecimento).</li>
            <li>Para regras de comportamento gerais, ajuste o prompt na aba Comportamento.</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> As abas Conhecimento e Ferramentas estão bloqueadas</p>
          <ul className="text-xs text-muted-foreground mt-1.5 space-y-1 list-disc pl-5">
            <li>Salve o agente primeiro (botão Salvar) — essas abas só funcionam após o agente existir no banco de dados.</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Uma ferramenta (webhook) não está sendo chamada</p>
          <ul className="text-xs text-muted-foreground mt-1.5 space-y-1 list-disc pl-5">
            <li>Revise a <strong>descrição</strong> da ferramenta — ela precisa deixar claro quando usá-la.</li>
            <li>Confirme que a URL responde corretamente a um POST de teste e devolve um JSON válido.</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> O agente respondeu errado ou "esqueceu" algo combinado</p>
          <ul className="text-xs text-muted-foreground mt-1.5 space-y-1 list-disc pl-5">
            <li>A memória de longo prazo é atualizada após cada conversa — pode levar uma troca de mensagens para "fixar" um fato novo.</li>
            <li>Informações muito específicas e fixas (preços, regras) devem estar na Base de Conhecimento, não depender só da memória.</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<string | null>("overview");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-indigo-500" />
          Central de Ajuda
        </h2>
        <p className="text-muted-foreground">
          Guia completo para configurar seus agentes, conectar o WhatsApp e ativar a inteligência do bot.
        </p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isOpen = open === section.id;
          return (
            <Card key={section.id} className="overflow-hidden">
              <button
                className="w-full text-left"
                onClick={() => setOpen(isOpen ? null : section.id)}
              >
                <CardHeader className="flex-row items-center gap-4 cursor-pointer hover:bg-secondary/20 transition-colors py-4">
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", section.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription>{section.subtitle}</CardDescription>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
                </CardHeader>
              </button>
              {isOpen && (
                <CardContent className="pt-0 border-t border-border">
                  <div className="pt-4">{section.content}</div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        Ainda com dúvidas? Revise a configuração do agente passo a passo seguindo a ordem desta página.
      </div>
    </div>
  );
}
