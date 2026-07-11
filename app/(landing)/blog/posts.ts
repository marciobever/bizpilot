// Artigos do blog — conteúdo real e instrutivo, baseado no que o produto faz.
// Regra: nada de métricas ou clientes inventados; datas são as de publicação real.

export type PostBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;      // ISO — formatada na exibição
  readingMin: number;
  content: PostBlock[];
};

export const POSTS: Post[] = [
  {
    slug: "atendente-ia-whatsapp-como-funciona",
    title: "Atendente de IA no WhatsApp: como funciona e o que muda no seu negócio",
    excerpt:
      "A diferença entre um chatbot de fluxo engessado e um agente de IA que entende contexto — e por que isso importa para quem atende clientes o dia inteiro.",
    category: "Guia",
    date: "2026-07-11",
    readingMin: 6,
    content: [
      { type: "p", text: "Se você já usou um chatbot tradicional, conhece a frustração: menus numerados, respostas que não entendem a pergunta e clientes desistindo no meio do caminho. Um agente de inteligência artificial funciona de outro jeito — ele lê a mensagem do cliente como um humano leria, entende a intenção e responde com base no conhecimento do seu negócio." },
      { type: "h2", text: "Chatbot de fluxo vs. agente de IA" },
      { type: "p", text: "O chatbot de fluxo é uma árvore de decisão: se o cliente digitar 1, mostra X; se digitar 2, mostra Y. Qualquer pergunta fora do roteiro quebra a conversa. O agente de IA generativa não segue um roteiro fixo — ele recebe instruções sobre o seu negócio (tom de voz, o que pode e o que não pode fazer) e formula respostas para qualquer pergunta dentro desse escopo." },
      { type: "ul", items: [
        "Entende variações: \"qual o preço?\", \"quanto custa?\" e \"tá caro?\" são a mesma intenção.",
        "Mantém contexto: lembra o que o cliente disse no início da conversa e não repete perguntas já respondidas.",
        "Sabe os limites: quando o assunto foge do escopo (ou o cliente pede um humano), transfere a conversa para atendimento humano.",
      ] },
      { type: "h2", text: "O que o agente faz no dia a dia" },
      { type: "p", text: "Na prática, um agente conectado ao WhatsApp do seu negócio responde dúvidas sobre produtos e serviços a qualquer hora, coleta dados do cliente (nome, e-mail, interesse) de forma natural durante a conversa, agenda horários direto na sua agenda e registra cada contato como lead no painel — com o histórico completo da conversa." },
      { type: "p", text: "Você acompanha tudo pelo painel: as conversas em tempo real, os leads capturados e o momento em que a IA transferiu para um humano. E pode pausar a IA em qualquer conversa para assumir pessoalmente." },
      { type: "h2", text: "Por onde começar" },
      { type: "p", text: "O caminho que recomendamos: crie o agente com o assistente guiado (ele monta as instruções a partir do seu tipo de negócio), conecte seu número de WhatsApp escaneando um QR Code, mande uma mensagem de teste você mesmo e ajuste o tom até ficar com a cara da sua empresa. Só então divulgue o número. Quinze minutos de teste evitam semanas de ajuste depois." },
    ],
  },
  {
    slug: "base-de-conhecimento-treinar-agente",
    title: "Base de conhecimento: como treinar seu agente com os dados do seu negócio",
    excerpt:
      "Seu agente responde melhor quando conhece seu catálogo, suas políticas e seus preços. Veja como alimentar a base de conhecimento — e o que evitar.",
    category: "Tutorial",
    date: "2026-07-11",
    readingMin: 5,
    content: [
      { type: "p", text: "Um agente de IA sem contexto responde genérico. A base de conhecimento é o que transforma um assistente qualquer no especialista do SEU negócio: é ali que você coloca catálogo, tabela de preços, políticas de troca, horários, perguntas frequentes — tudo que o agente precisa saber para responder como alguém de dentro." },
      { type: "h2", text: "Como funciona por baixo do capô" },
      { type: "p", text: "Cada documento que você adiciona é dividido em trechos e indexado. Quando um cliente pergunta algo, o agente busca os trechos mais relevantes para aquela pergunta e responde com base neles — técnica conhecida como RAG (retrieval-augmented generation). Isso significa que o agente cita o que está nos SEUS documentos, em vez de inventar." },
      { type: "h2", text: "Três formas de alimentar a base" },
      { type: "ul", items: [
        "Texto direto: cole o conteúdo (ex.: política de trocas) e dê um título claro.",
        "URL: aponte para uma página do seu site e o conteúdo é importado automaticamente.",
        "Sitemap: para sites com muitas páginas (catálogos, imobiliárias), importe várias páginas de uma vez a partir do sitemap.xml, com filtro por padrão de URL.",
      ] },
      { type: "h2", text: "O que colocar (e o que não colocar)" },
      { type: "p", text: "Coloque o que os clientes realmente perguntam: preços, prazos, formas de pagamento, endereço, diferenciais, respostas às objeções comuns. Documentos curtos e objetivos funcionam melhor que manuais gigantes — o agente encontra a informação mais rápido e responde mais preciso." },
      { type: "ul", items: [
        "Evite informação desatualizada: preço errado na base é preço errado na conversa. Revise quando algo mudar.",
        "Evite dados sensíveis: a base é para conhecimento público do negócio, não para dados de clientes.",
        "Evite duplicar: dois documentos dizendo coisas diferentes sobre o mesmo assunto confundem a resposta.",
      ] },
      { type: "p", text: "Dica final: depois de subir os documentos, teste com as 10 perguntas mais comuns dos seus clientes. Onde a resposta vier vaga, é sinal de que falta (ou sobra) conteúdo na base." },
    ],
  },
  {
    slug: "campanhas-whatsapp-boas-praticas",
    title: "Campanhas no WhatsApp sem bloqueio: boas práticas de disparo em massa",
    excerpt:
      "Disparo em massa mal feito derruba número. Veja como estruturar campanhas que engajam sem colocar seu WhatsApp em risco.",
    category: "Boas práticas",
    date: "2026-07-11",
    readingMin: 5,
    content: [
      { type: "p", text: "Campanhas em massa no WhatsApp são a forma mais direta de reativar clientes — e também a forma mais rápida de perder um número, se feitas sem critério. A diferença entre os dois cenários está em três coisas: para quem você manda, o que você manda e em que ritmo." },
      { type: "h2", text: "Para quem mandar" },
      { type: "p", text: "Dispare apenas para quem já teve contato com o seu negócio e espera ouvir de você: clientes, leads que conversaram com o agente, lista própria construída com consentimento. Lista comprada é o caminho mais curto para denúncias de spam — e denúncia em volume é o principal gatilho de bloqueio." },
      { type: "h2", text: "O que mandar" },
      { type: "ul", items: [
        "Mensagem com valor real: oferta concreta, novidade relevante, lembrete útil — não \"oi, tudo bem?\" em massa.",
        "Personalização: usar o nome do contato muda a taxa de resposta e reduz denúncias.",
        "Imagem ajuda quando agrega (novo produto, cardápio); enquetes são ótimas para engajar sem pedir texto.",
        "Identifique-se sempre: quem recebe precisa saber na primeira linha quem está falando.",
      ] },
      { type: "h2", text: "Em que ritmo" },
      { type: "p", text: "O envio da plataforma já aplica intervalos entre mensagens automaticamente, e cada campanha tem um teto de contatos por disparo — os dois limites existem para proteger o seu número. Prefira campanhas menores e segmentadas a um disparo gigante: além de mais seguras, convertem melhor." },
      { type: "h2", text: "O pós-disparo importa" },
      { type: "p", text: "Quem responde à campanha cai no atendimento normal do agente — que responde na hora, a qualquer hora. É aí que a campanha vira venda: o disparo abre a conversa, o agente conduz. Acompanhe pelo painel quantos receberam, quantos responderam e o que perguntaram; esse retorno é o insumo da próxima campanha." },
    ],
  },
  {
    slug: "agendamento-automatico-whatsapp",
    title: "Agendamento automático: conectando sua agenda ao WhatsApp",
    excerpt:
      "Do \"tem horário quinta?\" à consulta marcada na sua agenda — sem intervenção humana. Como funciona o agendamento pelo agente.",
    category: "Tutorial",
    date: "2026-07-11",
    readingMin: 4,
    content: [
      { type: "p", text: "Para clínicas, salões, consultórios e prestadores de serviço, a maior parte das mensagens é sobre uma coisa só: horário. Conectando sua agenda ao agente, esse vai-e-vem inteiro acontece sozinho — o cliente pergunta, o agente consulta a disponibilidade real e marca." },
      { type: "h2", text: "Como funciona" },
      { type: "p", text: "Você conecta sua conta do Google Calendar à plataforma uma única vez. A partir daí, quando um cliente pede horário, o agente consulta a agenda de verdade — nada de horários inventados — oferece as opções livres, confirma a escolha e cria o evento com os dados do cliente. Remarcação e cancelamento funcionam pelo mesmo caminho: o cliente pede na conversa, o agente resolve na agenda." },
      { type: "h2", text: "Lembretes automáticos" },
      { type: "p", text: "Agendamento confirmado não é presença garantida. Por isso o sistema envia lembretes automáticos pelo WhatsApp antes do horário marcado — o tipo de mensagem que reduz falta sem ninguém da equipe precisar lembrar de mandar." },
      { type: "h2", text: "Vários agentes, várias agendas" },
      { type: "p", text: "Se você tem mais de um agente (unidades ou serviços diferentes), cada um pode usar uma agenda própria — o agente da unidade centro marca na agenda do centro, o da zona sul na da zona sul. A conexão padrão da conta vale para todos, e o agente que precisar de agenda diferente sobrescreve só a dele." },
      { type: "h2", text: "Uma ressalva honesta" },
      { type: "p", text: "Hoje cada agente trabalha com uma agenda. Se o seu caso é uma recepção única marcando para vários profissionais na mesma conversa (\"quero com a Dra. Ana\" vs. \"com o Dr. Bruno\"), fale com a gente — é um cenário que estamos evoluindo e priorizamos com base em quem pede." },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatPostDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
