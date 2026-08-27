import { db } from '../db/database.js';

export interface AIDecisionResult {
  replyText: string;
  decision: 'interessado_fechar' | 'negociando' | 'duvida' | 'recusou' | 'outro';
  confidenceScore: number;
  reasoning: string;
  suggestedNextStep: string;
  shouldStopConversation: boolean;
  newStatusForCRM: 'convertido' | 'em_negociacao' | 'descartado' | 'contatado';
  detectedLanguage: 'BR' | 'US' | 'ES' | 'PT';
}

export interface ChatMessage {
  sender: 'lead' | 'ai' | 'user';
  message: string;
  created_at?: string;
}

export class AIBrainService {

  /**
   * Detecta o idioma da conversa com base no telefone e texto
   */
  public static detectLanguage(phone: string, text: string, leadCountry?: string): 'BR' | 'US' | 'ES' | 'PT' {
    const clean = phone.replace(/\D/g, '');
    const lower = text.toLowerCase();
    const country = (leadCountry || '').toLowerCase();

    // EUA / UK / English
    if (
      clean.startsWith('1') || 
      country.includes('united states') || 
      country.includes('eua') || 
      country.includes('usa') ||
      country.includes('uk') ||
      lower.includes('how much') || 
      lower.includes('price') || 
      lower.includes('not interested') || 
      lower.includes('send me') || 
      lower.includes('call me') || 
      lower.includes('sounds good')
    ) {
      return 'US';
    }

    // Espanha / Spanish
    if (
      clean.startsWith('34') || 
      country.includes('espanha') || 
      country.includes('spain') || 
      country.includes('es') ||
      lower.includes('cuanto') || 
      lower.includes('precio') || 
      lower.includes('no me interesa') || 
      lower.includes('mandame') || 
      lower.includes('gracias')
    ) {
      return 'ES';
    }

    // Portugal / European Portuguese
    if (clean.startsWith('351') || country.includes('portugal') || country.includes('pt')) {
      return 'PT';
    }

    return 'BR';
  }

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

    if (country.includes('espanha') || country.includes('spain') || country === 'es') {
      return `¡Hola! Espero que esté teniendo un excelente día. Mi nombre es ${senderName} y me especializo en diseño web y sistemas de captación digital para empresas en ${city}.

Estuve revisando negocios destacados de ${niche} en ${city} y encontré a *${name}*. Noté que todavía no disponen de una página web oficial o catálogo online optimizado para móviles.

Tener un sitio web rápido y moderno aumenta notablemente la confianza y las ventas locales. ¿Le gustaría recibir una demostración rápida y sin ningún compromiso para *${name}*?

Contacto directo por WhatsApp: ${senderPhone}
¡Un saludo cordial!`;
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
   * Analisa a mensagem recebida pelo cliente no WhatsApp em qualquer idioma, formula a resposta persuasiva e toma a decisão comercial
   */
  public static processIncomingMessage(params: {
    leadId?: string;
    leadName?: string;
    phone: string;
    incomingText: string;
    conversationHistory: ChatMessage[];
    senderName?: string;
    senderPhone?: string;
    leadCountry?: string;
  }): AIDecisionResult {
    const {
      leadName = 'Cliente',
      incomingText,
      conversationHistory,
      phone,
      senderName = 'Rômulo',
      senderPhone = '(27) 98817-2973',
      leadCountry
    } = params;

    const lower = incomingText.toLowerCase().trim();
    const lang = this.detectLanguage(phone, incomingText, leadCountry);

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
        newStatusForCRM: 'contatado',
        detectedLanguage: lang
      };
    }

    // ==========================================
    // INGLÊS (USA / UK / GLOBAL)
    // ==========================================
    if (lang === 'US') {
      const refusalUS = ['not interested', 'no thanks', 'stop messaging', 'remove my number', 'unsubscribe', 'do not contact', 'already have'];
      if (refusalUS.some(p => lower.includes(p))) {
        return {
          replyText: `No problem at all, ${leadName}! Thank you for your time and response. We will not reach out again. Wishing you and your business continued success! 🤝`,
          decision: 'recusou',
          confidenceScore: 98,
          reasoning: 'Customer explicitly stated they are not interested in English.',
          suggestedNextStep: 'Respect choice and mark as rejected in CRM.',
          shouldStopConversation: true,
          newStatusForCRM: 'descartado',
          detectedLanguage: 'US'
        };
      }

      if (lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('rates')) {
        return {
          replyText: `Great question, ${leadName}! Our custom high-speed websites and online booking setups range from $800 to $1,800 USD (with split payment milestones: 50% deposit and 50% upon final launch & approval).

To give you the most accurate quote, are you looking for an elegant corporate showcase or do you also need online reservations/order management?

I can also send over a live 2-minute demo link right away!`,
          decision: 'interessado_fechar',
          confidenceScore: 95,
          reasoning: 'US Lead asked for pricing and showed high buying interest.',
          suggestedNextStep: 'Present plans in USD and guide towards agreement.',
          shouldStopConversation: false,
          newStatusForCRM: 'em_negociacao',
          detectedLanguage: 'US'
        };
      }

      if (lower.includes('yes') || lower.includes('send') || lower.includes('show me') || lower.includes('interested') || lower.includes('contract') || lower.includes('deal')) {
        return {
          replyText: `Awesome, ${leadName}! I will prepare a personalized demo and our official service agreement for your review.

Would you prefer me to send the mockup link right here on WhatsApp, or would you like to schedule a quick 5-minute call today?`,
          decision: 'interessado_fechar',
          confidenceScore: 94,
          reasoning: 'Lead accepted proposal / asked for demo or contract in English.',
          suggestedNextStep: 'Send contract PDF in English and schedule launch.',
          shouldStopConversation: false,
          newStatusForCRM: 'em_negociacao',
          detectedLanguage: 'US'
        };
      }

      return {
        replyText: `Hello ${leadName}! Thanks for getting back to me. I am available to answer any questions about building or revamping your web presence with high-speed performance and mobile optimization.

Would you like me to send a free quick proposal for your review?`,
        decision: 'negociando',
        confidenceScore: 78,
        reasoning: 'General response handled in English.',
        suggestedNextStep: 'Awaiting reply.',
        shouldStopConversation: false,
        newStatusForCRM: 'contatado',
        detectedLanguage: 'US'
      };
    }

    // ==========================================
    // ESPANHOL (ESPANHA & EUROPA)
    // ==========================================
    if (lang === 'ES') {
      const refusalES = ['no me interesa', 'no gracias', 'deja de mandar', 'no quiero', 'ya tenemos'];
      if (refusalES.some(p => lower.includes(p))) {
        return {
          replyText: `¡Sin ningún problema, ${leadName}! Agradezco mucho su tiempo y amable respuesta. No volveremos a enviarle mensajes. ¡Mucho éxito en su negocio! 🤝`,
          decision: 'recusou',
          confidenceScore: 98,
          reasoning: 'Cliente rechazó la oferta en español.',
          suggestedNextStep: 'Respetar decisión y marcar como descartado.',
          shouldStopConversation: true,
          newStatusForCRM: 'descartado',
          detectedLanguage: 'ES'
        };
      }

      if (lower.includes('precio') || lower.includes('cuanto') || lower.includes('cuánto') || lower.includes('coste') || lower.includes('tarifa')) {
        return {
          replyText: `¡Excelente pregunta, ${leadName}! Nuestros proyectos web profesionales y catálogos digitales a medida oscilan entre 650€ y 1.500€ EUR (con facilidades de pago: 50% al inicio y 50% tras la entrega y aprobación final).

¿Estaría buscando una página corporativa para transmitir confianza o también requiere reservas/pedidos automatizados?

Si lo desea, ¡puedo enviarle un modelo previo ahora mismo!`,
          decision: 'interessado_fechar',
          confidenceScore: 95,
          reasoning: 'Lead preguntó por precios en euros.',
          suggestedNextStep: 'Presentar presupuesto en EUR y cerrar.',
          shouldStopConversation: false,
          newStatusForCRM: 'em_negociacao',
          detectedLanguage: 'ES'
        };
      }

      return {
        replyText: `¡Hola, ${leadName}! Gracias por responder. Quedo a su total disposición para resolver cualquier duda sobre cómo mejorar la presencia digital y ventas de su negocio. ¿Le gustaría recibir una propuesta sin compromiso?`,
        decision: 'negociando',
        confidenceScore: 80,
        reasoning: 'Respuesta en español.',
        suggestedNextStep: 'Esperar respuesta.',
        shouldStopConversation: false,
        newStatusForCRM: 'contatado',
        detectedLanguage: 'ES'
      };
    }

    // ==========================================
    // PORTUGUÊS (PORTUGAL & BRASIL)
    // ==========================================
    const refusalPatterns = [
      'não tenho interesse', 'nao tenho interesse', 'não quero', 'nao quero', 
      'não preciso', 'nao preciso', 'para de mandar', 'pare de mandar', 
      'tira meu numero', 'remover meu numero', 'não me mande', 'bloqueado',
      'não perturbe', 'dispensamos', 'já temos e não queremos'
    ];

    if (refusalPatterns.some(pattern => lower.includes(pattern))) {
      return {
        replyText: `Sem problemas, ${leadName}! Agradeço muito pelo seu retorno e pelo seu tempo. Não enviaremos mais mensagens. Se um dia precisar de suporte ou melhorias web, estamos à disposição. Desejo muito sucesso ao seu negócio! 🤝`,
        decision: 'recusou',
        confidenceScore: 98,
        reasoning: 'Cliente informou educadamente ou explicitamente que não tem interesse no momento.',
        suggestedNextStep: 'Respeitar a decisão e marcar como descartado no CRM.',
        shouldStopConversation: true,
        newStatusForCRM: 'descartado',
        detectedLanguage: lang
      };
    }

    const closingPatterns = [
      'quero ver', 'pode mandar', 'tenho interesse', 'gostei', 'vamos fazer', 
      'me liga', 'pode me ligar', 'qual o valor', 'como fazemos', 'fechado', 
      'quero sim', 'me manda', 'manda a proposta', 'vamos marcar', 'gostaria de ver',
      'quanto fica', 'qual preco', 'qual preço', 'manda aí', 'manda ai', 'pode ser',
      'sim, pode', 'sim por favor', 'como funciona o pagamento', 'manda o contrato'
    ];

    if (closingPatterns.some(pattern => lower.includes(pattern))) {
      const priceText = lang === 'PT' ? '650€ a 1.500€ EUR' : 'R$ 900 a R$ 1.800';

      if (lower.includes('valor') || lower.includes('preço') || lower.includes('preco') || lower.includes('quanto')) {
        return {
          replyText: `Excelente pergunta, ${leadName}! Nossos projetos são sob medida para não pesar no caixa: temos páginas profissionais e sites completos a partir de ${priceText} (podendo parcelar e com entrega em até 7-10 dias), já incluindo versão celular ultrarrápida e botão direto pro WhatsApp.

Para eu te passar o valor exato pro seu caso, você prefere um site institucional para passar confiança ou gostaria de incluir pedidos/agendamentos online?

Se preferir, posso te ligar em 2 minutinhos ou te mandar um modelo pronto agora mesmo!`,
          decision: 'interessado_fechar',
          confidenceScore: 95,
          reasoning: 'Lead perguntou preço e demonstrou forte interesse de compra.',
          suggestedNextStep: 'Apresentar opções de planos e direcionar para fechamento.',
          shouldStopConversation: false,
          newStatusForCRM: 'em_negociacao',
          detectedLanguage: lang
        };
      }

      return {
        replyText: `Maravilha, ${leadName}! Fico muito feliz pelo seu interesse.

Vou preparar uma prévia especial para a sua empresa mostrando a estrutura recomendada para atrair mais clientes e destacar seus serviços no Google.

Qual o melhor horário hoje para você dar uma olhadinha de 2 minutos? Posso te mandar o link por aqui mesmo ou te apresentar numa chamada rápida!`,
        decision: 'interessado_fechar',
        confidenceScore: 92,
        reasoning: 'Lead aceitou ver a demonstração e abriu canal de negociação.',
        suggestedNextStep: 'Enviar modelo e agendar fechamento com Rômulo.',
        shouldStopConversation: false,
        newStatusForCRM: 'em_negociacao',
        detectedLanguage: lang
      };
    }

    return {
      replyText: `Olá, ${leadName}! Obrigado pelo retorno.

Estou à disposição para tirar qualquer dúvida sobre como podemos criar ou modernizar a presença online da sua empresa com um site rápido, bonito e com foco em vendas.

Gostaria que eu te apresentasse uma proposta sem compromisso?`,
      decision: 'negociando',
      confidenceScore: 75,
      reasoning: 'Resposta padrão consultiva.',
      suggestedNextStep: 'Aguardar resposta ou enviar portfólio.',
      shouldStopConversation: false,
      newStatusForCRM: 'contatado',
      detectedLanguage: lang
    };
  }
}
