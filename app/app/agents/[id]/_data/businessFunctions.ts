import type { AgentFunction } from "@/lib/agentTemplates";

// Catálogo de funções (o que o bot faz no dia a dia) tailored por segmento.
// 2 camadas, somadas na tela "Funções" do wizard:
//   1. GROUP_FUNCTIONS  — baseline compartilhado por todos os tipos de um grupo.
//   2. TYPE_EXTRA_FUNCTIONS — específicas de um tipo de negócio dentro do grupo,
//      quando o baseline do grupo não cobre uma necessidade real do nicho.
// Ver app/app/agents/wizard/_hooks/useWizardFlow.ts (businessTypeToSector) pra
// composição final: universal "dúvidas" + grupo + extras do tipo.

function fn(id: string, label: string, emoji: string, prompt: string, limitations?: string[], enableDataRecords?: boolean): AgentFunction {
  return { id, label, emoji, prompt, limitations, enableDataRecords };
}

export const GROUP_FUNCTIONS: Record<string, AgentFunction[]> = {
  "saude-beleza": [
    fn("agendamento", "Agendar horário", "📅", "=== AGENDAMENTO ===\nColete (um dado por vez): serviço desejado, nome, contato e 1ª/2ª opção de data e horário. Informe que a equipe confirmará por este canal."),
    fn("reagendamento", "Reagendar / cancelar", "🔄", "=== REAGENDAMENTO E CANCELAMENTO ===\nColete os dados do agendamento existente e a nova preferência (ou o cancelamento) e informe que a equipe processará."),
    fn("precos_servicos", "Preços e serviços", "💳", "=== PREÇOS E SERVIÇOS ===\nResponda sobre serviços disponíveis e valores com base na Base de Conhecimento. Se não houver o dado, diga que vai confirmar com a equipe."),
    fn("profissional_pref", "Preferência de profissional", "🧑‍⚕️", "=== PREFERÊNCIA DE PROFISSIONAL ===\nSe houver mais de um profissional, pergunte a preferência do cliente e registre junto ao agendamento."),
  ],
  "alimentacao": [
    fn("cardapio", "Dúvidas de cardápio", "📋", "=== CARDÁPIO ===\nResponda sobre pratos, ingredientes e opções (vegano/sem glúten/alergias) com base na Base de Conhecimento."),
    fn("pedido", "Fazer pedido", "🧾", "=== PEDIDO ===\nColete os itens desejados, quantidade e observações. Confirme o pedido completo (itens + valor total) antes de finalizar.",
      ["Confirmar sempre o pedido completo antes de finalizar"]),
    fn("horario_local", "Horário e localização", "📍", "=== HORÁRIO E LOCALIZAÇÃO ===\nInforme horário de funcionamento, endereço e formas de acesso com base na Base de Conhecimento."),
  ],
  "fitness": [
    fn("planos_matricula", "Planos e matrícula", "📋", "=== PLANOS E MATRÍCULA ===\nApresente os planos disponíveis e valores com base na Base de Conhecimento, destacando benefícios de cada um. Incentive a matrícula ou aula experimental."),
    fn("agendamento_aula", "Agendar aula / experimental", "📅", "=== AGENDAMENTO ===\nColete nome, contato e 1ª/2ª opção de dia e horário para aula experimental ou avaliação. Informe que a equipe confirmará."),
    fn("duvidas_modalidade", "Dúvidas sobre modalidade", "❓", "=== MODALIDADE ===\nExplique modalidades oferecidas, nível exigido e faixa etária com base na Base de Conhecimento."),
  ],
  "imoveis": [
    fn("qualificacao", "Qualificação do interesse", "🎯", "=== QUALIFICAÇÃO ===\nCom perguntas naturais (uma por vez), descubra o objetivo (compra, locação ou avaliação), tipo de imóvel, região e orçamento."),
    fn("visitas", "Agendamento de visitas", "📅", "=== AGENDAMENTO DE VISITAS ===\nQuando houver interesse, ofereça agendar uma visita. Colete nome, telefone e 1ª/2ª opção de dia e horário. Informe que a equipe confirmará a disponibilidade.",
      ["Não agendar visita sem confirmar a disponibilidade do responsável"]),
  ],
  "educacao": [
    fn("matricula_info", "Informações e matrícula", "📋", "=== MATRÍCULA E INFORMAÇÕES ===\nResponda sobre cursos/turmas, valores e forma de matrícula com base na Base de Conhecimento."),
    fn("aula_experimental", "Agendar aula experimental", "📅", "=== AULA EXPERIMENTAL ===\nColete nome, contato e disponibilidade para agendar uma aula experimental ou avaliação. Informe que a equipe confirmará."),
  ],
  "profissional-liberal": [
    fn("qualificacao_caso", "Entender o caso / projeto", "🎯", "=== ENTENDIMENTO DO CASO ===\nCom perguntas naturais (uma por vez), entenda a necessidade do cliente e o contexto antes de qualquer proposta."),
    fn("orcamento", "Orçamento inicial", "🧾", "=== ORÇAMENTO ===\nColete os detalhes necessários e, se houver faixas de preço na Base de Conhecimento, informe. Caso contrário, diga que a equipe enviará uma proposta."),
  ],
  "comercio": [
    fn("duvidas_produto", "Dúvidas de produto", "🔎", "=== DÚVIDAS DE PRODUTO ===\nResponda sobre características, disponibilidade e preço com base na Base de Conhecimento. Não invente especificações."),
    fn("precos_disponibilidade", "Preços e disponibilidade", "💳", "=== PREÇOS E DISPONIBILIDADE ===\nInforme preços e estoque disponível com base na Base de Conhecimento. Nunca confirme disponibilidade sem essa base."),
  ],
  "marketing-digital": [
    fn("qualificacao_negocio", "Entender o negócio / objetivo", "🎯", "=== QUALIFICAÇÃO ===\nCom 1-2 perguntas, entenda o segmento do cliente, os canais que já usa e o principal objetivo (leads, vendas, alcance)."),
  ],
  "veiculos": [
    fn("duvidas_veiculo", "Dúvidas gerais", "❓", "=== DÚVIDAS ===\nResponda sobre serviços, preços e prazos com base na Base de Conhecimento. Pergunte marca, modelo e ano do veículo quando for relevante para a resposta."),
  ],
  "eventos": [
    fn("orcamento_evento", "Orçamento de evento", "🧾", "=== ORÇAMENTO ===\nRegistre: tipo de evento, data, número de convidados, local e orçamento disponível. Informe que a equipe confirmará disponibilidade e enviará a proposta."),
  ],
  "casa-servicos": [
    fn("orcamento_servico", "Orçamento de serviço", "🧾", "=== ORÇAMENTO ===\nRegistre: tipo de serviço, endereço/região, urgência e detalhes do problema. Informe que a equipe confirmará disponibilidade e valor.",
      ["Nunca confirmar orçamento fechado sem avaliação ou visita técnica quando aplicável"]),
  ],
  "turismo": [
    fn("reserva_datas", "Reserva de datas", "📅", "=== RESERVA ===\nColete: datas desejadas, número de pessoas e preferências. Informe que a equipe confirmará a disponibilidade."),
    fn("duvidas_pacote", "Dúvidas sobre pacote / estrutura", "❓", "=== DÚVIDAS ===\nResponda sobre estrutura, inclusos e valores com base na Base de Conhecimento."),
  ],
};

export const TYPE_EXTRA_FUNCTIONS: Record<string, AgentFunction[]> = {
  // ── Saúde & Beleza ──────────────────────────────────────────────────────
  clinica: [
    fn("convenios", "Convênios e valores", "💳", "=== CONVÊNIOS ===\nResponda sobre convênios aceitos e valores de particular consultando a Base de Conhecimento."),
    fn("triagem", "Triagem inicial", "🩺", "=== TRIAGEM ===\nFaça perguntas leves para entender a queixa principal e direcionar à especialidade certa. Nunca diagnostique — apenas direcione."),
  ],
  dentista: [
    fn("convenios", "Convênios e valores", "💳", "=== CONVÊNIOS ===\nResponda sobre convênios aceitos e valores de particular consultando a Base de Conhecimento."),
    fn("procedimentos", "Orientações pré/pós-procedimento", "ℹ️", "=== PROCEDIMENTOS ===\nExplique de forma simples o preparo e cuidados gerais dos procedimentos, com base na Base de Conhecimento. Não substitua orientação clínica."),
  ],
  psicologo: [
    fn("acolhimento_inicial", "Acolhimento inicial", "🤍", "=== ACOLHIMENTO ===\nAcolha o primeiro contato com empatia, explique como funciona o processo de agendamento e garanta total privacidade sobre o que for compartilhado."),
  ],
  nutricionista: [
    fn("anamnese", "Anamnese inicial", "📝", "=== ANAMNESE ===\nRegistre objetivos, restrições alimentares e histórico relevante informado pelo cliente antes da primeira consulta.", undefined, true),
  ],
  fisio: [
    fn("anamnese", "Anamnese inicial", "📝", "=== ANAMNESE ===\nRegistre a queixa principal, se há indicação médica e histórico de lesões antes da primeira sessão.", undefined, true),
  ],
  veterinario: [
    fn("cadastro_pet", "Cadastro do pet", "🐾", "=== CADASTRO DO PET ===\nColete sempre nome, espécie, raça e idade do pet antes de prosseguir com o agendamento ou dúvida.", undefined, true),
  ],
  estetica: [
    fn("contraindicacoes", "Cuidados e contraindicações", "⚠️", "=== CONTRAINDICAÇÕES ===\nPergunte sobre alergias, gestação ou condições relevantes antes de agendar procedimentos invasivos."),
  ],
  depilacao: [
    fn("contraindicacoes", "Cuidados pré/pós", "⚠️", "=== CUIDADOS ===\nInforme cuidados pré e pós-procedimento com base na Base de Conhecimento."),
  ],
  massoterapia: [
    fn("contraindicacoes", "Preferências e contraindicações", "⚠️", "=== CONTRAINDICAÇÕES ===\nPergunte sobre preferências de massagem e eventuais contraindicações de saúde antes de agendar."),
  ],

  // ── Alimentação ─────────────────────────────────────────────────────────
  delivery: [fn("entrega", "Endereço e status da entrega", "🛵", "=== ENTREGA ===\nColete endereço completo e forma de pagamento. Informe status e tempo estimado de entrega com base na Base de Conhecimento.")],
  pizzaria: [fn("entrega", "Endereço e status da entrega", "🛵", "=== ENTREGA ===\nColete endereço completo, sabores, tamanho e borda. Confirme o pedido completo antes de finalizar.")],
  hamburgueria: [fn("entrega", "Endereço e status da entrega", "🛵", "=== ENTREGA ===\nColete endereço completo, ponto da carne e adicionais. Confirme o pedido completo antes de finalizar.")],
  lanchonete: [fn("entrega", "Endereço e status da entrega", "🛵", "=== ENTREGA ===\nColete endereço completo quando o pedido for para entrega. Confirme o pedido antes de finalizar.")],
  foodtruck: [fn("localizacao_dia", "Localização do dia", "📍", "=== LOCALIZAÇÃO ===\nInforme a localização e horário de funcionamento do dia com base na Base de Conhecimento.")],
  marmitaria: [fn("restricoes", "Restrições alimentares", "🥗", "=== RESTRIÇÕES ===\nSempre pergunte sobre restrições alimentares e alergias antes de fechar o plano de marmitas.", ["Sempre perguntar sobre restrições alimentares e alergias"])],
  vegano: [fn("restricoes", "Restrições alimentares", "🥗", "=== RESTRIÇÕES ===\nPergunte sobre restrições alimentares específicas (vegano estrito, sem glúten, etc.) antes de recomendar pratos.")],
  restaurante: [fn("reserva_mesa", "Reserva de mesa", "🍽️", "=== RESERVA DE MESA ===\nColete data, horário e número de pessoas. Informe que a equipe confirmará a disponibilidade.")],
  churrascaria: [fn("reserva_mesa", "Reserva de mesa", "🍽️", "=== RESERVA DE MESA ===\nColete data, horário e número de pessoas. Pergunte se é rodízio ou à la carte.")],
  bar: [fn("reserva_mesa", "Reserva de mesa / eventos", "🍽️", "=== RESERVA ===\nColete data, horário e número de pessoas. Informe sobre programação musical quando houver.")],
  confeitaria: [fn("encomenda", "Encomendas personalizadas", "🎂", "=== ENCOMENDAS ===\nRegistre produto, quantidade, personalização, data de entrega e forma de pagamento. Confirme prazo mínimo antes de aceitar.", ["Confirmar prazo mínimo para encomendas"])],

  // ── Fitness ─────────────────────────────────────────────────────────────
  personal: [fn("evolucao", "Registrar evolução do aluno", "📊", "=== EVOLUÇÃO ===\nRegistre peso, medidas, cargas e evolução do aluno ao longo do tempo.", ["Nunca prescrever treinos sem orientação do profissional"], true)],
  corrida: [fn("evolucao", "Registrar evolução do atleta", "📊", "=== EVOLUÇÃO ===\nRegistre pace atual, objetivos de prova e histórico de treinos informados pelo cliente.", undefined, true)],
  pilates: [fn("avaliacao_fisica", "Avaliação física inicial", "🩺", "=== AVALIAÇÃO INICIAL ===\nPergunte sobre condições físicas e lesões antes do primeiro agendamento.", ["Sempre perguntar sobre condições físicas antes do agendamento"])],
  yoga: [fn("avaliacao_fisica", "Nível de experiência", "🧘", "=== NÍVEL ===\nPergunte sobre experiência prévia e objetivo (relaxamento, flexibilidade, força) antes de recomendar uma turma.")],
  "artes-marciais": [fn("avaliacao_fisica", "Faixa etária e modalidade", "🥋", "=== MODALIDADE ===\nPergunte a modalidade de interesse e a faixa etária para recomendar a turma certa.")],
  natacao: [fn("avaliacao_fisica", "Nível de habilidade", "🏊", "=== NÍVEL ===\nPergunte faixa etária e nível de habilidade (iniciante/intermediário/avançado) antes de indicar a turma.")],

  // ── Imóveis ─────────────────────────────────────────────────────────────
  imobiliaria: [
    fn("compra_venda", "Compra e venda", "🏷️", "=== COMPRA E VENDA ===\nIdentifique tipo de imóvel, região, faixa de preço, quartos e forma de pagamento. Apresente no máximo 3 opções por vez."),
    fn("locacao", "Locação / aluguel", "🔑", "=== LOCAÇÃO ===\nIdentifique tipo de imóvel, região, valor pretendido e data de mudança. Explique documentos exigidos sem prometer aprovação."),
    fn("captacao", "Captação de imóveis", "📥", "=== CAPTAÇÃO ===\nSe a pessoa quiser anunciar o imóvel, colete tipo, endereço/bairro e valor pretendido. Avise que um consultor entrará em contato."),
  ],
  corretor: [
    fn("compra_venda", "Compra e venda", "🏷️", "=== COMPRA E VENDA ===\nIdentifique tipo de imóvel, região, faixa de preço e forma de pagamento."),
    fn("locacao", "Locação / aluguel", "🔑", "=== LOCAÇÃO ===\nIdentifique tipo de imóvel, região e valor pretendido de aluguel."),
  ],
  condominio: [fn("chamados", "Registro de chamados", "🛠️", "=== CHAMADOS ===\nRegistre tipo de solicitação, unidade e dados do morador.", ["Encaminhar solicitações urgentes para o síndico ou zelador"])],
  temporada: [fn("reserva_temporada", "Reserva por período", "📅", "=== RESERVA ===\nConfirme datas, número de hóspedes e imóvel de interesse antes de reservar.")],
  construtora: [fn("empreendimento", "Apresentar empreendimentos", "🏗️", "=== EMPREENDIMENTOS ===\nApresente empreendimentos disponíveis com base na Base de Conhecimento, conforme o perfil e orçamento do cliente.")],
  loteadora: [fn("empreendimento", "Apresentar loteamentos", "🏗️", "=== LOTEAMENTOS ===\nApresente lotes disponíveis com base na Base de Conhecimento, conforme localização e orçamento do cliente.")],

  // ── Educação ────────────────────────────────────────────────────────────
  professor: [fn("avaliacao_nivel", "Avaliação de nível e objetivo", "📊", "=== AVALIAÇÃO ===\nRegistre nível atual, matérias de interesse e objetivo (ENEM, vestibular, reforço).", undefined, true)],
  idiomas: [fn("avaliacao_nivel", "Avaliação de nível", "📊", "=== AVALIAÇÃO ===\nPergunte o idioma de interesse e o nível atual antes de indicar a turma.")],
  "escola-musica": [fn("avaliacao_nivel", "Instrumento e nível", "🎵", "=== AVALIAÇÃO ===\nPergunte o instrumento de interesse, idade e nível de experiência antes de indicar a turma.")],
  cursinho: [fn("avaliacao_nivel", "Objetivo do aluno", "🎯", "=== OBJETIVO ===\nPergunte o vestibular/prova alvo e a matéria com maior dificuldade para indicar o melhor módulo.")],
  autoescola: [fn("processo_habilitacao", "Processo de habilitação", "🚦", "=== HABILITAÇÃO ===\nInforme categorias disponíveis, documentos exigidos e etapas do processo com base na Base de Conhecimento.")],
  "curso-online": [fn("suporte_tecnico", "Suporte técnico da plataforma", "🖥️", "=== SUPORTE TÉCNICO ===\nOriente sobre acesso à plataforma e problemas técnicos comuns. Escale para o suporte se não resolver.")],
  creche: [fn("rotina_infantil", "Rotina e faixa etária", "🧸", "=== ROTINA ===\nPergunte a faixa etária da criança e o período desejado (integral/parcial) antes de apresentar valores.")],

  // ── Profissional Liberal ────────────────────────────────────────────────
  advogado: [fn("sigilo_dados", "Coleta sigilosa do caso", "🔒", "=== COLETA DO CASO ===\nRegistre nome, contato, área do direito e breve descrição do caso, deixando claro o sigilo das informações.", ["Manter total sigilo sobre informações dos clientes"])],
  contador: [fn("qualificacao_fiscal", "Qualificação PF/PJ", "📊", "=== QUALIFICAÇÃO ===\nIdentifique se é PF ou PJ, porte da empresa e principais necessidades contábeis.")],
  coach: [fn("registro_objetivos", "Registrar objetivos", "🎯", "=== OBJETIVOS ===\nRegistre os objetivos principais, desafios e o programa escolhido pelo cliente.", ["Não prometer resultados garantidos"], true)],
  terapeuta: [fn("registro_objetivos", "Registrar objetivos", "🎯", "=== OBJETIVOS ===\nRegistre o que motivou a busca e o objetivo do cliente com a terapia.", undefined, true)],
  arquiteto: [fn("briefing_projeto", "Briefing do projeto", "📐", "=== BRIEFING ===\nRegistre tipo de projeto, metragem, orçamento, prazo e estilo desejado.", ["Nunca confirmar orçamentos sem visita técnica"])],
  designer: [fn("briefing_projeto", "Briefing do projeto", "🎨", "=== BRIEFING ===\nRegistre tipo de projeto, prazo, referências de estilo e orçamento.")],
  engenheiro: [fn("briefing_projeto", "Briefing da obra/projeto", "📐", "=== BRIEFING ===\nRegistre tipo de obra ou projeto, localização e orçamento estimado.")],
  rh: [fn("coleta_candidato", "Triagem de candidato", "🧑‍💼", "=== TRIAGEM ===\nRegistre vaga desejada, experiência relevante e pretensão salarial do candidato.", undefined, true)],
  segurador: [fn("qualificacao_seguro", "Qualificação do seguro", "🛡️", "=== QUALIFICAÇÃO ===\nColete tipo de seguro, perfil do cliente e dados do bem a segurar.", ["Nunca confirmar coberturas sem consultar a apólice"])],

  // ── Comércio ────────────────────────────────────────────────────────────
  ecommerce: [
    fn("rastreamento", "Rastreamento de pedido", "📦", "=== RASTREAMENTO ===\nPeça o número do pedido ou CPF e informe o status com base na Base de Conhecimento."),
    fn("trocas", "Trocas e devoluções", "🔄", "=== TROCA E DEVOLUÇÃO ===\nExplique a política e colete número do pedido, motivo e, em caso de defeito, foto do produto."),
    fn("pagamento", "Pagamento e parcelamento", "💳", "=== PAGAMENTO ===\nEsclareça formas de pagamento e parcelamento. NUNCA peça dados completos de cartão pelo chat.", ["Nunca solicitar número completo de cartão, CVV ou senha pelo chat"]),
  ],
  petshop: [fn("cadastro_pet", "Cadastro do pet", "🐾", "=== CADASTRO DO PET ===\nSempre pergunte nome, raça e porte do pet antes de recomendar produtos ou serviços.", ["Nunca fornecer orientações veterinárias"], true)],
  farmacia: [fn("aviso_receita", "Conferência de receita", "💊", "=== RECEITA ===\nPergunte se o medicamento exige receita e, se sim, solicite o envio da foto antes de confirmar a venda.", ["Nunca recomendar medicamentos", "Medicamentos controlados exigem receita"])],
  otica: [fn("conferencia_receita", "Conferência de grau", "👓", "=== RECEITA ===\nConfirme o grau (receita) do cliente antes de processar pedidos de lentes.")],
  autopecas: [fn("identificar_veiculo", "Identificar veículo", "🚗", "=== IDENTIFICAÇÃO ===\nPergunte marca, modelo e ano do veículo antes de indicar a peça correta.")],

  // ── Marketing Digital & Afiliados ──────────────────────────────────────
  afiliado: [
    fn("buscar_ofertas", "Buscar ofertas/produtos", "🔎", "=== BUSCA DE OFERTAS ===\nQuando o usuário pedir um produto ou oferta, use a ferramenta buscar_produto_afiliado com o termo informado. Os produtos são enviados automaticamente com foto e link de afiliado — não os reliste em texto.",
      ["Nunca inventar preço, avaliação ou link — usar apenas o que a busca retornar"]),
    fn("post_redes", "Criar post para redes", "📝", "=== CRIAÇÃO DE POSTS ===\nApós o usuário escolher um produto, monte legenda curta e persuasiva (gancho + benefício + chamada para ação) sempre com o link de afiliado. Máximo 2-3 emojis."),
    fn("comparar_ofertas", "Comparar produtos", "⚖️", "=== COMPARAÇÃO ===\nCompare preço, avaliação e diferenças com base apenas nos dados retornados pela busca."),
  ],
  agencia: [fn("proposta_orcamento", "Proposta e orçamento", "🧾", "=== PROPOSTA ===\nColete segmento, canais de interesse e orçamento antes de indicar um plano.", ["Nunca prometer resultados (CPC, ROI) sem análise"])],
  "gestor-trafego": [fn("proposta_orcamento", "Proposta e orçamento", "🧾", "=== PROPOSTA ===\nQualifique plataforma desejada (Meta, Google), orçamento mensal e objetivo da campanha.")],
  "social-media": [fn("proposta_orcamento", "Proposta e orçamento", "🧾", "=== PROPOSTA ===\nColete segmento, redes sociais ativas e objetivo principal antes de propor um plano.")],
  dropshipping: [
    fn("buscar_ofertas", "Buscar ofertas/produtos", "🔎", "=== BUSCA DE OFERTAS ===\nUse a ferramenta buscar_produto_afiliado com o termo informado. Confirme prazo de entrega e política de devolução antes de finalizar a venda."),
  ],

  // ── Veículos & Mobilidade ───────────────────────────────────────────────
  "loja-carros": [fn("qualificacao_compra", "Qualificação da compra", "🎯", "=== QUALIFICAÇÃO ===\nColete tipo (novo/seminovo), marca preferida, orçamento e forma de pagamento.")],
  "loja-motos": [fn("qualificacao_compra", "Qualificação da compra", "🎯", "=== QUALIFICAÇÃO ===\nColete cilindrada, estilo (street/trail/sport), orçamento e habilitação.")],
  mecanica: [fn("diagnostico_sintoma", "Diagnóstico por sintoma", "🔧", "=== DIAGNÓSTICO ===\nPergunte marca, modelo, ano e o sintoma apresentado para agilizar o diagnóstico e o orçamento.", ["Nunca confirmar orçamento fechado sem avaliação presencial"])],
  "lava-rapido": [fn("agendamento_lavagem", "Agendar lavagem", "🧽", "=== AGENDAMENTO ===\nColete tipo de veículo, serviço desejado e horário preferido.")],
  despachante: [fn("servico_documentacao", "Serviço e documentação", "📄", "=== DOCUMENTAÇÃO ===\nPergunte qual serviço (transferência, CRLV, licenciamento) e quais documentos o cliente já tem em mãos.")],
  locadora: [fn("reserva_veiculo", "Reserva de veículo", "🚗", "=== RESERVA ===\nConfirme datas, local de retirada e categoria do veículo antes de reservar.")],
  "oficina-som": [fn("compatibilidade_veiculo", "Compatibilidade do veículo", "🔊", "=== COMPATIBILIDADE ===\nPergunte marca, modelo e ano do veículo para recomendar acessórios compatíveis.")],

  // ── Eventos & Entretenimento ────────────────────────────────────────────
  dj: [fn("disponibilidade_data", "Disponibilidade na data", "🎧", "=== DISPONIBILIDADE ===\nConfirme se há disponibilidade na data do evento antes de avançar na proposta.")],
  "foto-eventos": [fn("disponibilidade_data", "Disponibilidade na data", "📸", "=== DISPONIBILIDADE ===\nConfirme se há disponibilidade na data do evento antes de avançar na proposta.")],
  cerimonialista: [fn("disponibilidade_data", "Disponibilidade na data", "📋", "=== DISPONIBILIDADE ===\nConfirme se há disponibilidade na data do evento antes de avançar na proposta.")],
  decoracao: [fn("disponibilidade_data", "Disponibilidade na data", "🎈", "=== DISPONIBILIDADE ===\nConfirme se há disponibilidade na data do evento e pergunte o tema desejado.")],
  teatro: [fn("info_ingressos", "Informações de ingressos", "🎟️", "=== INGRESSOS ===\nInforme programação, horários e disponibilidade de ingressos com base na Base de Conhecimento.")],

  // ── Casa & Serviços ─────────────────────────────────────────────────────
  reforma: [fn("visita_tecnica", "Agendar visita técnica", "📐", "=== VISITA TÉCNICA ===\nRegistre tipo de obra, metragem estimada e localização. Explique que o orçamento depende de visita técnica.", ["Nunca confirmar orçamentos sem visita técnica"])],
  pinturas: [fn("visita_tecnica", "Metragem e prazo", "🎨", "=== AVALIAÇÃO ===\nPergunte metragem, tipo de ambiente (interno/externo) e prazo desejado.")],
  marmoraria: [fn("visita_tecnica", "Especificação técnica", "🪨", "=== ESPECIFICAÇÃO ===\nPergunte tipo de pedra/vidro, metragem e local de aplicação.")],
  eletricista: [fn("urgencia_atendimento", "Urgência do atendimento", "⚡", "=== URGÊNCIA ===\nPergunte sobre o problema, localização e se é uma urgência para priorizar o atendimento.")],
  encanador: [fn("urgencia_atendimento", "Urgência do atendimento", "🚿", "=== URGÊNCIA ===\nPergunte sobre o problema, localização e se é uma urgência para priorizar o atendimento.")],
  "ar-condicionado": [fn("urgencia_atendimento", "Instalação ou manutenção", "❄️", "=== AVALIAÇÃO ===\nPergunte BTUs necessários, tipo de ambiente e se é instalação nova ou manutenção.")],
  dedetizacao: [fn("urgencia_atendimento", "Tipo de praga e urgência", "🐜", "=== AVALIAÇÃO ===\nPergunte tipo de praga, tamanho do imóvel e urgência do atendimento.")],
  mudanca: [fn("logistica_mudanca", "Logística da mudança", "📦", "=== LOGÍSTICA ===\nRegistre endereços de origem e destino, volume estimado e data desejada.")],

  // ── Turismo & Hospitalidade ─────────────────────────────────────────────
  hotel: [fn("checkin_checkout", "Check-in / check-out", "🏨", "=== CHECK-IN/OUT ===\nConfirme datas de check-in/out, número de hóspedes e tipo de quarto antes de reservar.")],
  resort: [fn("checkin_checkout", "Check-in / check-out", "🏝️", "=== CHECK-IN/OUT ===\nConfirme datas de check-in/out e número de hóspedes antes de apresentar pacotes.")],
  airbnb: [fn("checkin_checkout", "Check-in / check-out e regras", "🏠", "=== CHECK-IN/OUT ===\nConfirme datas, número de hóspedes e regras da propriedade antes de reservar.")],
  "agencia-viagem": [fn("roteiro_personalizado", "Roteiro personalizado", "🗺️", "=== ROTEIRO ===\nColete destino, datas, número de viajantes, orçamento e preferências para montar um roteiro.", undefined, true)],
  guia: [fn("roteiro_atividades", "Roteiros e atividades", "🗺️", "=== ROTEIRO ===\nInforme sobre roteiros disponíveis, pontos turísticos e possibilidades de personalização.")],
  camping: [fn("roteiro_atividades", "Estrutura e atividades", "🏕️", "=== ESTRUTURA ===\nInforme sobre estrutura disponível, datas livres e atividades oferecidas.")],
  barco: [fn("roteiro_atividades", "Roteiro do passeio", "⛵", "=== ROTEIRO ===\nConfirme data, número de pessoas, duração e roteiro desejado do passeio.")],
};
