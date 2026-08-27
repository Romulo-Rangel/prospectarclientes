import { db } from '../db/database.js';
import { BusinessHoursService } from './business-hours.service.js';

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
   * Base de Conhecimento e Aconselhamento Tecnológico Especializado
   */
  public static getTechAdvice(nicheText: string, lang: 'BR' | 'US' | 'ES' | 'PT' = 'BR'): string {
    const n = (nicheText || '').toLowerCase();

    // Alimentação / Restaurantes / Bares
    if (n.includes('restaurante') || n.includes('pizzaria') || n.includes('hamburguer') || n.includes('bar') || n.includes('café') || n.includes('food') || n.includes('pizza')) {
      if (lang === 'US') {
        return `💡 *Tech Strategy for Restaurants:* Relying only on third-party delivery apps costs you up to 30% in commission fees per order. Having your own direct online ordering system saves thousands each month, builds your own customer database, and speeds up WhatsApp orders.`;
      }
      return `💡 *Dica Estratégica para Gastronomia:* Depender 100% de apps de delivery custa entre 25% e 30% de comissão em cada pedido. Ter um Cardápio Digital próprio com botão direto pro WhatsApp zera essas taxas, fideliza a sua clientela e aumenta o lucro líquido imediatamente.`;
    }

    // Clínicas / Saúde / Estética
    if (n.includes('clínica') || n.includes('dentista') || n.includes('médic') || n.includes('estética') || n.includes('salão') || n.includes('barbearia') || n.includes('dental') || n.includes('clinic')) {
      if (lang === 'US') {
        return `💡 *Tech Strategy for Clinics:* Automated 24/7 online scheduling reduces patient no-shows by up to 40% with automated WhatsApp appointment reminders, while boosting Google search credibility.`;
      }
      return `💡 *Dica Estratégica para Clínicas & Saúde:* Mais de 60% dos pacientes pesquisam e querem agendar fora do horário comercial (à noite ou finais de semana). Um sistema de agendamento online 24h integrado ao WhatsApp evita a perda de pacientes para a concorrência e reduz faltas com lembretes automáticos.`;
    }

    // B2B / Serviços Especializados / Mecânicas / Advogados
    if (n.includes('advocacia') || n.includes('contabil') || n.includes('oficina') || n.includes('imobili') || n.includes('móveis') || n.includes('marcenaria')) {
      if (lang === 'US') {
        return `💡 *Tech Strategy for High-Ticket Services:* Over 85% of clients evaluate website speed (under 1.5s load time) and SSL security before requesting quotes. Google ranks fast, mobile-friendly sites on the top 3 spots of Google Maps.`;
      }
      return `💡 *Dica Estratégica para Serviços & B2B:* No Google, quem tem site com carregamento em menos de 1 segundo (Google Core Web Vitals) e segurança SSL ganha a preferência do algoritmo para ficar no topo do Google Maps, transmitindo autoridade e atraindo orçamentos de maior valor.`;
    }

    if (lang === 'US') {
      return `💡 *Tech Strategy:* A modern mobile-optimized web infrastructure increases Google local discovery by 3x and converts visitors into paying customers instantly via direct chat integrations.`;
    }
    return `💡 *Dica de Tecnologia & Conversão:* Hoje, 80% das buscas por serviços locais acontecem no celular. Um site ultrarrápido com botão de chamada direta para o WhatsApp multiplica a taxa de conversão de visitantes em clientes pagantes.`;
  }

  /**
   * Gera abordagem inicial hiper-personalizada com aconselhamento consultivo
   */
  public static generateInitialPitch(lead: any, senderName: string = 'Rômulo', senderPhone: string = '(27) 98817-2973'): string {
    const name = lead.name || 'Empresa';
    const niche = lead.category || 'o seu segmento';
    const city = lead.city || 'sua região';
    const country = (lead.country || 'Brasil').toLowerCase();

    // Check language
    if (country.includes('united states') || country.includes('eua') || country === 'us') {
      return `Hello! Hope you are having a productive week. My name is ${senderName} and I am a Software Engineer & Web Architect.

I came across *${name}* while researching standout ${niche} in ${city}, and noticed you do not have an official, fast-loading business website set up on Google Maps yet.

${this.getTechAdvice(niche, 'US')}

We build high-converting websites optimized for smartphones with instant booking and direct chat integrations. Would you be open to a quick, free 2-minute mockup for *${name}*?

You can reply directly here or on WhatsApp: ${senderPhone}
Best regards!`;
    }

    if (country.includes('espanha') || country.includes('spain') || country === 'es') {
      return `¡Hola! Espero que esté teniendo un excelente día. Mi nombre es ${senderName}, desarrollador de software y soluciones web para empresas en ${city}.

Estuve revisando negocios destacados de ${niche} en ${city} y encontré a *${name}*. Noté que todavía no disponen de una página web oficial o catálogo online optimizado para móviles.

Tener un sitio web rápido y moderno aumenta notablemente la confianza y las ventas locales. ¿Le gustaría recibir una demostración rápida y sin ningún compromiso para *${name}*?

Contacto directo por WhatsApp: ${senderPhone}
¡Un saludo cordial!`;
    }

    if (country.includes('portugal') || country === 'pt') {
      return `Olá! Espero que se encontre bem. O meu nome é ${senderName} e sou especialista em arquitetura web e plataformas digitais para empresas em ${city}.

Estive a acompanhar o trabalho da *${name}* no setor de ${niche}, e reparei que ainda não dispõem de um sítio web próprio com pedidos ou agendamentos integrados.

${this.getTechAdvice(niche, 'PT')}

Teria disponibilidade para ver uma demonstração rápida e sem compromisso de como ficaria a nova plataforma da *${name}*?

Pode responder diretamente por aqui ou no meu WhatsApp: ${senderPhone}
Com os melhores cumprimentos!`;
    }

    // Default Brasil (PT-BR)
    if (lead.website_status === 'error' || lead.website_status === 'offline') {
      return `Olá! Tudo bem? Me chamo ${senderName} e sou desenvolvedor e especialista em infraestrutura e sistemas web.

Estava pesquisando referências de ${niche} em ${city} e encontrei a *${name}*. Fui tentar acessar o site de vocês (${lead.website || 'link do Google'}), mas notei que a página está fora do ar ou com erro no servidor.

Como a maioria dos clientes pesquisa no Google antes de fechar negócio, isso pode estar custando clientes todos os dias. Se precisarem de ajuda para restabelecer ou colocar uma página moderna e rápida no ar, fico à total disposição!

Pode me responder por aqui mesmo ou no WhatsApp: ${senderPhone}`;
    }

    return `Olá, tudo bem? Me chamo ${senderName} e sou desenvolvedor de software especialista em sites de alta performance e automações para empresas de ${city}.

Encontrei a *${name}* com ótimas avaliações em ${niche}, mas percebi que vocês ainda não possuem um site próprio ou catálogo digital oficial no Google Maps.

${this.getTechAdvice(niche, 'BR')}

Posso te enviar uma prévia visual rápida de como ficaria o site da *${name}* sem nenhum custo ou compromisso?

Se preferir, pode me chamar direto por aqui ou no meu WhatsApp: ${senderPhone}`;
  }

  /**
   * Analisa a mensagem recebida pelo cliente no WhatsApp com aconselhamento técnico e respeito ao horário comercial
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
    leadNiche?: string;
  }): AIDecisionResult {
    const {
      leadName = 'Cliente',
      incomingText,
      conversationHistory,
      phone,
      senderName = 'Rômulo',
      senderPhone = '(27) 98817-2973',
      leadCountry,
      leadNiche = ''
    } = params;

    const lower = incomingText.toLowerCase().trim();
    const lang = this.detectLanguage(phone, incomingText, leadCountry);

    // 0. ANÁLISE DE CONTATOS PESSOAIS / FAMILIARES (Segurança Absoluta)
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

    // 1. CHECAGEM DE HORÁRIO COMERCIAL (8h/dia e intervalo de almoço)
    const bhStatus = BusinessHoursService.checkCurrentStatus();
    if (!bhStatus.isWorkingTime && bhStatus.respectBusinessHours) {
      const outOfHoursMsg = BusinessHoursService.getOutOfHoursMessage(lang, bhStatus);
      return {
        replyText: outOfHoursMsg,
        decision: 'duvida',
        confidenceScore: 90,
        reasoning: bhStatus.isLunchTime ? 'Cliente enviou mensagem no horário de almoço.' : 'Cliente enviou mensagem fora do expediente comercial.',
        suggestedNextStep: 'Aguardar retomada do expediente para dar sequência ao atendimento.',
        shouldStopConversation: false,
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

      if (lower.includes('tech') || lower.includes('how it works') || lower.includes('what do you build') || lower.includes('features')) {
        return {
          replyText: `Here is exactly how our tech architecture works for your business, ${leadName}:

⚡ *Ultra-Fast Performance:* Built on modern web stacks achieving 95+ on Google PageSpeed (sub-1 second load time).
📱 *Mobile-First & Responsive:* Flawless layout on iPhone, Android and tablets.
🛡️ *Enterprise Security:* Free SSL certificate, Cloudflare DDoS shielding, and custom domain setup.
📅 *Automated Lead Capture:* Direct WhatsApp integration + automated calendar bookings.

Would you like me to send a live mockup showing this structure customized for ${leadName}?`,
          decision: 'duvida',
          confidenceScore: 96,
          reasoning: 'US Lead asked about technology stack and architectural benefits.',
          suggestedNextStep: 'Send live demo mockup and explain technical advantages.',
          shouldStopConversation: false,
          newStatusForCRM: 'em_negociacao',
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

    // DÚVIDAS TÉCNICAS E ACONSELHAMENTO DE TECNOLOGIA
    if (
      lower.includes('como funciona') || 
      lower.includes('o que inclui') || 
      lower.includes('tecnologia') || 
      lower.includes('vantagem') || 
      lower.includes('hospedagem') || 
      lower.includes('dominio') || 
      lower.includes('domínio') || 
      lower.includes('segurança')
    ) {
      return {
        replyText: `Com certeza, ${leadName}! Como desenvolvedor especialista, estruturamos a sua página com as melhores tecnologias do mercado:

⚡ *Velocidade Extrema (Google PageSpeed 95+):* Carregamento em menos de 1 segundo para não perder nenhum cliente por lentidão;
📱 *Design 100% Responsivo:* Perfeito e adaptado para iPhone, Android e computadores;
🔒 *Segurança & Certificado SSL:* Cadeado de segurança verde ativado e proteção contra ataques;
🚀 *SEO Google Maps:* Estrutura otimizada para a sua empresa aparecer na primeira página das buscas locais;
📲 *Botão Direto de WhatsApp:* Facilita o contato do cliente em apenas 1 clique.

${this.getTechAdvice(leadNiche, lang)}

Gostaria de ver uma prévia visual rápida de como ficaria para a *${leadName}*?`,
        decision: 'duvida',
        confidenceScore: 96,
        reasoning: 'Lead solicitou detalhes técnicos. A IA forneceu consultoria especializada com argumentos de autoridade e valor.',
        suggestedNextStep: 'Enviar modelo e apresentar proposta de fechamento.',
        shouldStopConversation: false,
        newStatusForCRM: 'em_negociacao',
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
          replyText: `Excelente pergunta, ${leadName}! Nossos projetos são sob medida para não pesar no caixa: temos páginas profissionais e sistemas completos a partir de ${priceText} (podendo parcelar com 50% de entrada e 50% na entrega após aprovação).

O projeto já inclui hospedagem rápida, domínio configurado, versão celular ultrarrápida e botão direto pro WhatsApp.

Para eu te passar a proposta exata, você gostaria de uma página institucional de autoridade ou também quer incluir catálogo/agendamentos online?

Se preferir, posso te apresentar numa chamada rápida de 2 minutinhos ou te mandar o modelo por aqui!`,
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
