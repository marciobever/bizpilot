import { MessageCircle, Webhook, Link as LinkIcon, Database, CalendarDays, Mail } from "lucide-react";

export const INTEGRATIONS_META = [
  {
    id: "instagram",
    name: "Instagram Direct",
    description: "Responda DMs e comentários em tempo real via Meta Graph.",
    icon: MessageCircle,
    category: "Mensageria",
    color: "text-pink-500",
    bgClass: "bg-pink-500/10 border-pink-500/20",
  },
  {
    id: "facebook",
    name: "Facebook Messenger",
    description: "Atenda clientes na página oficial do seu negócio no Facebook.",
    icon: MessageCircle,
    category: "Mensageria",
    color: "text-blue-500",
    bgClass: "bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "supabase",
    name: "Banco de Dados Integrado",
    description: "Seus contatos e leads já ficam sincronizados automaticamente — sem configuração necessária.",
    icon: Database,
    category: "Armazenamento",
    color: "text-foreground",
    bgClass: "bg-secondary border-border",
  },
  {
    id: "webhook",
    name: "Notificações Externas",
    description: "Avise outros sistemas automaticamente quando o bot qualificar ou fechar uma venda.",
    icon: Webhook,
    category: "Automações",
    color: "text-foreground",
    bgClass: "bg-secondary border-border",
  },
  {
    id: "payments",
    name: "Links de Pagamento",
    description: "Permita que o agente envie links de pagamento (Pix, cartão, boleto) nas conversas.",
    icon: LinkIcon,
    category: "Pagamentos",
    color: "text-foreground",
    bgClass: "bg-secondary border-border",
  },
  {
    id: "calendar",
    name: "Calendário / Agenda",
    description: "Permita que o agente consulte horários livres e marque reuniões com os leads.",
    icon: CalendarDays,
    category: "Produtividade",
    color: "text-violet-500",
    bgClass: "bg-violet-500/10 border-violet-500/20",
  },
  {
    id: "external_db",
    name: "Banco de Dados Externo",
    description: "Conecte seu próprio Supabase ou Firebase para o agente consultar seus clientes, fornecedores ou produtos.",
    icon: Database,
    category: "Seus Dados",
    color: "text-cyan-500",
    bgClass: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "email",
    name: "E-mail",
    description: "Permita que o agente envie e-mails (orçamentos, comprovantes, materiais) para os leads durante a conversa.",
    icon: Mail,
    category: "Comunicação",
    color: "text-amber-500",
    bgClass: "bg-amber-500/10 border-amber-500/20",
  },
];

export const WEBHOOK_EVENTS = [
  { value: "lead_qualified", label: "Lead qualificado" },
  { value: "lead_converted", label: "Lead convertido (venda)" },
];

export const PAYMENT_PROVIDERS: { value: string; label: string; keyLabel: string; help: string }[] = [
  {
    value: "pix",
    label: "Pix direto (sem gateway)",
    keyLabel: "",
    help: "Gera o código Pix Copia e Cola direto para a sua chave Pix, sem taxas e sem confirmação automática de pagamento.",
  },
  {
    value: "mercadopago",
    label: "Mercado Pago",
    keyLabel: "Access Token de Produção",
    help: "Painel do Mercado Pago → Seu negócio → Configurações → Credenciais de produção.",
  },
  {
    value: "asaas",
    label: "Asaas",
    keyLabel: "Chave de API",
    help: "Painel do Asaas → Configurações da conta → Integrações → Chaves de API.",
  },
  {
    value: "woovi",
    label: "Woovi (Pix)",
    keyLabel: "AppID",
    help: "Painel da Woovi → Aplicações → Gerar AppID.",
  },
  {
    value: "stripe",
    label: "Stripe",
    keyLabel: "Chave Secreta (Secret Key)",
    help: "Painel da Stripe → Desenvolvedores → Chaves de API → Chave secreta (sk_live_... ou sk_test_...).",
  },
];

export const CALENDAR_PROVIDERS: { value: string; label: string }[] = [
  { value: "calcom", label: "Cal.com" },
  { value: "calendly", label: "Calendly" },
  { value: "google", label: "Google Calendar" },
];

export const EXTERNAL_DB_PROVIDERS: { value: string; label: string }[] = [
  { value: "supabase", label: "Supabase" },
  { value: "firebase", label: "Firebase (Firestore)" },
];

export const SMTP_PRESETS: Record<string, { label: string; host: string; port: number; secure: boolean; docUrl?: string; docLabel?: string }> = {
  gmail: {
    label: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    docUrl: "https://myaccount.google.com/apppasswords",
    docLabel: 'Gerar uma "Senha de app" do Gmail (exige verificação em 2 etapas ativada)',
  },
  outlook: {
    label: "Outlook / Hotmail",
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    docUrl: "https://support.microsoft.com/pt-br/account-billing/usar-senhas-de-aplicativo-com-aplicativos-que-n%C3%A3o-d%C3%A3o-suporte-%C3%A0-verifica%C3%A7%C3%A3o-em-duas-etapas-5896ed9b-4263-e681-128a-a6f2979a7944",
    docLabel: "Criar uma senha de app no Outlook",
  },
  zoho: {
    label: "Zoho Mail",
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    docUrl: "https://www.zoho.com/mail/help/zoho-smtp.html",
    docLabel: "Ver dados de SMTP do Zoho",
  },
  custom: {
    label: "Outro provedor (manual)",
    host: "",
    port: 465,
    secure: true,
  },
};

export const EMAIL_TEMPLATES: { id: string; name: string; desc: string }[] = [
  { id: "minimal", name: "Simples", desc: "Mensagem direta, sem cabeçalho." },
  { id: "branded", name: "Com marca", desc: "Cabeçalho colorido com o nome da empresa." },
  { id: "professional", name: "Profissional", desc: "Borda superior e rodapé formal." },
  { id: "modern", name: "Moderno", desc: "Sotaque minimalista com a cor da marca." },
];

export const EMAIL_API_PROVIDERS: { value: string; label: string; help: string; docUrl: string; docLabel: string }[] = [
  {
    value: "resend",
    label: "Resend",
    help: "Painel da Resend → API Keys → Create API Key. Requer domínio verificado.",
    docUrl: "https://resend.com/docs/dashboard/api-keys/introduction",
    docLabel: "Criar conta e chave na Resend",
  },
  {
    value: "sendgrid",
    label: "SendGrid",
    help: "Painel do SendGrid → Settings → API Keys → Create API Key. Requer remetente verificado.",
    docUrl: "https://www.twilio.com/docs/sendgrid/ui/account-and-settings/api-keys",
    docLabel: "Criar conta e chave no SendGrid",
  },
];
