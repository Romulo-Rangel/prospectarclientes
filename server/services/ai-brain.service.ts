import { db } from '../db/database.js';

export interface AIDecisionResult {
  replyText: string;
  decision: 'interessado_fechar' | 'negociando' | 'duvida' | 'recusou' | 'outro';
  confidenceScore: number;
  reasoning: string;
  suggestedNextStep: string;
  shouldStopConversation: boolean;
  newStatusForCRM: 'convertido' | 'em_negociacao' | 'descartado' | 'contatado';
}

export interface ChatMessage {
  sender: 'lead' | 'ai' | 'user';
  message: string;
  created_at?: string;
}

export class AIBrainService {

  /**
   * Gera abordagem inicial hiper-personalizada baseada na dor específica da empresa
   */
  public static generateInitialPitch(lead: any, senderName: string = 'Rômulo', senderPhone: string = '(27) 98817-2973'): string {
    const name = lead.name || 'Empresa';
    const niche = lead.category || 'o seu segmento';
    const city = lead.city || 'sua região';
    const country = (lead.country || 'Brasil').toLowerCase();

    // Check language
    if (country.includes('united states') || country.includes('eua') || country === 'us') {
      return `Hello! Hope you are having a productive week. My name is ${senderName} and I build modern, high-converting websites and booking systems for local businesses in ${city}.

I came across *${name}* while researching standout ${niche} in ${city}, and noticed you do not have an official website or online reservation platform set up on Google yet.

A sleek, mobile-optimized website makes a massive difference in customer trust and online bookings. Would you be open to a quick, free 2-minute mockup for *${name}*?

You can reply directly here or on WhatsApp: ${senderPhone}
Best regards!`;
    }

    if (country.includes('portugal') || country === 'pt') {
      return `Olá, viva! Espero que esteja tudo bem. O meu nome é ${senderName} e sou especialista em desenvolvimento de websites modernos e plataformas de agendamento online.

Estive a acompanhar o excelente trabalho da *${name}* em ${city} no setor de ${niche}, e reparei que ainda não dispõem de um sítio web próprio com pedidos ou agendamentos integrados.

Atualmente, um website rápido e profissional duplica a confiança dos clientes que pesquisam no Google. Teria disponibilidade para ver uma demonstração rápida e sem compromisso para a *${name}*?

Pode responder diretamente por aqui ou no meu WhatsApp: ${senderPhone}
Com os melhores cumprimentos!`;
    }

    // Default Brasil (PT-BR)
    if (lead.website_status === 'error' || lead.website_status === 'offline') {
      return `Olá! Tudo bem? Me chamo ${senderName} e sou especialista em desenvolvimento e infraestrutura de sistemas web.

Estava pesquisando referências de ${niche} em ${city} e encontrei a *${name}*. Fui tentar acessar o site de vocês (${lead.website || 'link do Google'}), mas notei que a página está com erro ou fora do ar no momento.

Como muitos clientes tentam acessar o site antes de comprar, isso pode estar custando vendas todos os dias. Se precisarem de ajuda para restabelecer ou colocar uma página moderna e rápida no ar, fico à total disposição!

Pode me responder por aqui mesmo ou no WhatsApp: ${senderPhone}`;
    }

    return `Olá, tudo bem? Me chamo ${senderName} e trabalho desenvolvendo sites profissionais e sistemas de agendamento/pedidos para empresas de ${city}.

Encontrei a *${name}* com ótimas avaliações em ${niche}, mas percebi que vocês ainda não possuem um site próprio ou cardápio/catálogo digital no Google Maps.

Hoje, mais de 80% dos clientes buscam no Google antes de entrar em contato. Criamos sistemas rápidos com botão direto para o WhatsApp que passam muita credibilidade e aumentam as vendas.

Posso te enviar uma prévia visual rápida de como ficaria o site da *${name}* sem nenhum custo ou compromisso?

Se preferir, pode me chamar direto por aqui ou no meu WhatsApp: ${senderPhone}`;
  }

  /**
   * Analisa a mensagem recebida pelo cliente no WhatsApp, formula a resposta persuasiva e toma a decisão comercial
   */
  public static processIncomingMessage(params: {
    leadId?: string;
    leadName?: string;
    phone: string;
    incomingText: string;
    conversationHistory: ChatMessage[];
    senderName?: string;
    senderPhone?: string;
  }): AIDecisionResult {
    const {
      leadName = 'Cliente',
      incomingText,
      conversationHistory,
      senderName = 'Rômulo',
      senderPhone = '(27) 98817-2973'
    } = params;

    const lower = incomingText.toLowerCase().trim();

    // 1. ANÁLISE DE RECUSA EXPLÍCITA (Cliente não tem interesse / pede para parar)
    const refusalPatterns = [
      'não tenho interesse', 'nao tenho interesse', 'não quero', 'nao quero', 
      'não preciso', 'nao preciso', 'para de mandar', 'pare de mandar', 
      'tira meu numero', 'remover meu numero', 'não me mande', 'bloqueado',
      'não perturbe', 'dispensamos', 'já temos e não queremos'
    ];

    // 0. ANÁLISE DE CONTATOS PESSOAIS / FAMILIARES (Segurança Extra)
    const personalPatterns = [
      'bênção', 'bencao', 'mãe', 'mae', 'pai', 'irmão', 'irmao', 'filho', 'filha',
      'amor', 'vida', 'meu bem', 'churrasco', 'futebol', 'e aí mano', 'e ai mano',
      'fala mano', 'fala parça', 'trampo', 'reunião interna', 'almoço em família'
    ];

    if (personalPatterns.some(pattern => lower.includes(pattern))) {
      return {
        replyText: '', // Fica em silêncio absoluto
        decision: 'outro',
        confidenceScore: 99,
        reasoning: 'Detectada mensagem de cunho estritamente pessoal/familiar. A IA não interfere.',
        suggestedNextStep: 'Nenhuma ação comercial necessária.',
        shouldStopConversation: true,
        newStatusForCRM: 'contatado'
      };
    }

    if (refusalPatterns.some(pattern => lower.includes(pattern))) {
      return {
        replyText: `Sem problemas, ${leadName}! Agradeço muito pelo seu retorno e pelo seu tempo. Não enviaremos mais mensagens. Se um dia precisar de suporte ou melhorias web, estamos à disposição. Desejo muito sucesso ao seu negócio! 🤝`,
        decision: 'recusou',
        confidenceScore: 98,
        reasoning: 'Cliente informou educadamente ou explicitamente que não tem interesse no momento.',
        suggestedNextStep: 'Respeitar a decisão e marcar como descartado no CRM.',
        shouldStopConversation: true,
        newStatusForCRM: 'descartado'
      };
    }

    // 2. ANÁLISE DE ALTO INTERESSE / QUER FECHAR / AGENDAMENTO / PEDIU PROPOSTA
    const closingPatterns = [
      'quero ver', 'pode mandar', 'tenho interesse', 'gostei', 'vamos fazer', 
      'me liga', 'pode me ligar', 'qual o valor', 'como fazemos', 'fechado', 
      'quero sim', 'me manda', 'manda a proposta', 'vamos marcar', 'gostaria de ver',
      'quanto fica', 'qual preco', 'qual preço', 'manda aí', 'manda ai', 'pode ser',
      'sim, pode', 'sim por favor', 'como funciona o pagamento'
    ];

    if (closingPatterns.some(pattern => lower.includes(pattern))) {
      // Se perguntou preço especificamente
      if (lower.includes('valor') || lower.includes('preço') || lower.includes('preco') || lower.includes('quanto')) {
        return {
          replyText: `Excelente pergunta, ${leadName}! Nossos projetos são sob medida para não pesar no caixa: temos páginas profissionais e sites completos a partir de R$ 900 a R$ 1.800 (podendo parcelar e com entrega em até 7 dias), já incluindo versão celular ultrarrápida e botão direto pro WhatsApp.

Para eu te passar o valor exato pro seu caso, você prefere um site institucional para passar confiança ou gostaria de incluir pedidos/agendamentos online?

Se preferir, posso te ligar em 2 minutinhos ou te mandar um modelo pronto agora mesmo!`,
          decision: 'interessado_fechar',
          confidenceScore: 95,
          reasoning: 'Lead perguntou preço e demonstrou forte interesse de compra.',
          suggestedNextStep: 'Apresentar opções de planos e direcionar para fechamento.',
          shouldStopConversation: false,
          newStatusForCRM: 'em_negociacao'
        };
      }

      // Se aceitou ver a prévia / proposta
      return {
        replyText: `Maravilha, ${leadName}! Fico muito feliz pelo seu interesse.

Vou preparar uma prévia especial para a sua empresa mostrando a estrutura recomendada para atrair mais clientes e destacar seus serviços no Google.

Qual o melhor horário hoje para você dar uma olhadinha de 2 minutos? Posso te mandar o link por aqui mesmo ou te apresentar numa chamada rápida!`,
        decision: 'interessado_fechar',
        confidenceScore: 92,
        reasoning: 'Lead aceitou ver a demonstração e abriu canal de negociação.',
        suggestedNextStep: 'Enviar modelo e agendar fechamento com Rômulo.',
        shouldStopConversation: false,
        newStatusForCRM: 'em_negociacao'
      };
    }

    // 3. ANÁLISE DE OBJEÇÃO: "JÁ TENHO QUEM FAZ" OU "JÁ TENHO SITE"
    if (lower.includes('já tenho') || lower.includes('ja tenho') || lower.includes('ja possuo') || lower.includes('tenho programador')) {
      return {
        replyText: `Que ótimo, ${leadName}! É excelente saber que vocês já valorizam a presença digital.

O nosso trabalho muitas vezes complementa o que vocês já têm: fazemos otimização de velocidade para o site abrir em menos de 2 segundos no celular, melhoria de SEO no Google ou automação de atendimento no WhatsApp.

Seu site atual tem gerado o volume de contatos que você gostaria, ou sente que daria para converter ainda mais clientes?`,
        decision: 'negociando',
        confidenceScore: 88,
        reasoning: 'Objeção de fornecedor existente tratada com técnica consultiva de agregação de valor.',
        suggestedNextStep: 'Sondar dor de conversão e velocidade.',
        shouldStopConversation: false,
        newStatusForCRM: 'em_negociacao'
      };
    }

    // 4. ANÁLISE DE PERGUNTAS GERAIS: "COMO FUNCIONA?", "QUEM É?", "ONDE VOCÊS FICAM?"
    if (lower.includes('como funciona') || lower.includes('quem é') || lower.includes('quem e') || lower.includes('onde fica') || lower.includes('de onde')) {
      return {
        replyText: `Olá! Sou o ${senderName}, desenvolvedor de software e consultor web. 

Nós criamos páginas de alta conversão, sites modernos e sistemas web que transformam visitantes do Google em clientes no WhatsApp da sua empresa. Cuidamos de tudo: design, textos, hospedagem rápida e suporte contínuo.

O processo é super simples e sem burocracia: entregamos seu site pronto em poucos dias. Gostaria de ver 2 exemplos de projetos que já desenvolvemos?`,
        decision: 'duvida',
        confidenceScore: 85,
        reasoning: 'Cliente pediu explicações de funcionamento da agência.',
        suggestedNextStep: 'Enviar portfólio e proposta simplificada.',
        shouldStopConversation: false,
        newStatusForCRM: 'contatado'
      };
    }

    // 5. RESPOSTA PADRÃO CONSULTIVA E POLIDA
    return {
      replyText: `Olá, ${leadName}! Obrigado pelo retorno.

Estou à disposição para tirar qualquer dúvida sobre como podemos criar ou modernizar a presença online da sua empresa com um site rápido, bonito e com foco em vendas.

Gostaria que eu te apresentasse uma proposta sem compromisso?`,
      decision: 'negociando',
      confidenceScore: 75,
      reasoning: 'Resposta genérica do lead atendida com cordialidade e reabertura consultiva.',
      suggestedNextStep: 'Aguardar resposta ou enviar portfólio.',
      shouldStopConversation: false,
      newStatusForCRM: 'contatado'
    };
  }
}
