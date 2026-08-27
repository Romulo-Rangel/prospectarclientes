import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { db } from '../db/database.js';

export type ContractLanguage = 'BR' | 'US' | 'ES' | 'PT';

export interface ContractData {
  leadId: string;
  leadName: string;
  clientPhone: string;
  clientAddress?: string;
  clientCity?: string;
  country?: string;
  language?: ContractLanguage;
  serviceTitle?: string;
  totalValue?: string;
  paymentTerms?: string;
  deliveryDays?: number;
  providerName?: string;
  providerPhone?: string;
  providerDoc?: string;
}

const DEFAULT_TEMPLATES_BY_LANG: Record<ContractLanguage, any> = {
  BR: {
    lang: 'BR',
    title: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO DE WEBSITE & SISTEMA WEB',
    providerName: 'Rômulo (LeadHunter Pro / Desenvolvimento Web)',
    providerPhone: '(27) 98817-2973',
    providerDoc: 'Profissional Desenvolvedor de Software',
    serviceTitle: 'Desenvolvimento de Website Profissional de Alta Conversão & Sistema Web',
    defaultPrice: 'R$ 1.200,00',
    defaultPaymentTerms: '50% no início do projeto (entrada) e 50% após aprovação e publicação do site',
    defaultDeliveryDays: 10,
    clauses: [
      'CLÁUSULA 1ª - DO OBJETO: A CONTRATADA compromete-se a desenvolver, configurar e publicar o website profissional para a CONTRATANTE, contemplando layout moderno, responsividade para smartphones, otimização de velocidade, botão de contato direto para o WhatsApp e boas práticas de SEO para o Google.',
      'CLÁUSULA 2ª - DAS ETAPAS E PRAZOS: O projeto será desenvolvido e entregue no prazo acordado de dias úteis, a contar do envio dos materiais básicos (logotipo, fotos ou informações) por parte da CONTRATANTE.',
      'CLÁUSULA 3ª - DO VALOR E FORMA DE PAGAMENTO: Pela prestação dos serviços acordados, a CONTRATANTE pagará o valor estipulado conforme as condições acordadas via PIX ou transferência.',
      'CLÁUSULA 4ª - DA GARANTIA E SUPORTE: A CONTRATADA concede 30 (trinta) dias de garantia técnica e suporte gratuito pós-lançamento para correções, ajustes finos e garantia de pleno funcionamento.',
      'CLÁUSULA 5ª - DO ACEITE DIGITAL: As partes reconhecem a validade jurídica do presente acordo e concordância expressa através de confirmação eletrônica via WhatsApp ou e-mail.'
    ]
  },
  US: {
    lang: 'US',
    title: 'WEB DEVELOPMENT & DIGITAL SERVICES AGREEMENT',
    providerName: 'Rômulo (LeadHunter Pro / Web Solutions)',
    providerPhone: '+55 27 98817-2973',
    providerDoc: 'Professional Software & Web Developer',
    serviceTitle: 'Custom High-Converting Business Website & Booking System',
    defaultPrice: '$1,200.00 USD',
    defaultPaymentTerms: '50% upfront deposit upon contract signing, 50% upon project completion & launch',
    defaultDeliveryDays: 10,
    clauses: [
      'SECTION 1 - SCOPE OF WORK: The SERVICE PROVIDER agrees to design, build, optimize, and deploy a responsive business website for the CLIENT, including mobile speed optimization, Google SEO readiness, direct contact integrations, and user-friendly navigation.',
      'SECTION 2 - TIMELINE & MILESTONES: The project will be completed within the agreed business days starting from the date all necessary assets (logo, branding, content) are provided by the CLIENT.',
      'SECTION 3 - FEES & PAYMENT: The CLIENT agrees to pay the total agreed amount in accordance with the payment schedule outlined herein via wire transfer, credit card, or agreed online gateway.',
      'SECTION 4 - WARRANTY & ONGOING SUPPORT: The SERVICE PROVIDER provides a 30-day full technical warranty post-launch for bug fixes, performance adjustments, and technical guidance at no additional charge.',
      'SECTION 5 - DIGITAL ACCEPTANCE: Both parties recognize the full legal validity of this electronic agreement upon written confirmation via WhatsApp or Email.'
    ]
  },
  ES: {
    lang: 'ES',
    title: 'CONTRATO DE PRESTACIÓN DE SERVICIOS DE DESARROLLO WEB Y SOFTWARE',
    providerName: 'Rômulo (LeadHunter Pro / Desarrollo Web)',
    providerPhone: '+55 27 98817-2973',
    providerDoc: 'Desarrollador Profesional de Software',
    serviceTitle: 'Desarrollo de Sitio Web Profesional de Alta Conversión y Catálogo Digital',
    defaultPrice: '950,00 € EUR',
    defaultPaymentTerms: '50% al inicio del proyecto y 50% contra entrega y aprobación final',
    defaultDeliveryDays: 10,
    clauses: [
      'CLÁUSULA 1ª - OBJETO: El PRESTADOR se compromete a diseñar, programar y publicar el sitio web profesional para el CLIENTE, optimizado para dispositivos móviles, velocidad de carga, integración directa con WhatsApp y posicionamiento SEO en Google.',
      'CLÁUSULA 2ª - PLAZOS DE ENTREGA: El proyecto será finalizado en el plazo estipulado de días hábiles a partir de la recepción de los materiales básicos por parte del CLIENTE.',
      'CLÁUSULA 3ª - PRECIO Y FORMA DE PAGO: Por los servicios pactados, el CLIENTE abonará el importe total según los términos y modalidades acordadas mediante transferencia bancaria o pasarela de pago.',
      'CLÁUSULA 4ª - GARANTÍA Y SOPORTE TÉCNICO: El PRESTADOR otorga 30 días de garantía y soporte técnico gratuito posterior al lanzamiento para correcciones y ajustes operativos.',
      'CLÁUSULA 5ª - ACEPTACIÓN DIGITAL: Las partes reconocen la plena validez de este acuerdo mediante confirmación por medios electrónicos (WhatsApp o correo electrónico).'
    ]
  },
  PT: {
    lang: 'PT',
    title: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO DE WEBSITES',
    providerName: 'Rômulo (LeadHunter Pro / Desenvolvimento Web)',
    providerPhone: '+55 27 98817-2973',
    providerDoc: 'Especialista em Desenvolvimento Web',
    serviceTitle: 'Desenvolvimento de Website Profissional, Responsivo e Otimizado',
    defaultPrice: '950,00 € EUR',
    defaultPaymentTerms: '50% com a adjudicação da proposta e 50% após conclusão e publicação',
    defaultDeliveryDays: 10,
    clauses: [
      'CLÁUSULA 1ª - OBJETO DO CONTRATO: O PRESTADOR compromete-se a conceber, estruturar e alojar a plataforma web da ENTIDADE CONTRATANTE, com design responsivo, otimização para telemóveis, integração direta de contacto e SEO para motores de busca.',
      'CLÁUSULA 2ª - PRAZOS DE EXECUÇÃO: Os trabalhos serão concluídos no prazo estipulado de dias úteis, contados a partir da receção dos conteúdos e elementos de identificação gráfica.',
      'CLÁUSULA 3ª - CONDIÇÕES FINANCEIRAS: A CONTRATANTE liquidará o valor acordado em conformidade com as tranches estipuladas por transferência bancária ou referência.',
      'CLÁUSULA 4ª - GARANTIA E ASSISTÊNCIA PÓS-VENDA: É concedida uma garantia técnica de 30 dias após o lançamento para retificação de eventuais anomalias e apoio inicial.',
      'CLÁUSULA 5ª - VALIDADE DO CONSENTIMENTO: O presente contrato considera-se formalizado e válido mediante concordância expressa por via digital (WhatsApp ou correio eletrónico).'
    ]
  }
};

export class ContractService {
  private static contractsDir = path.resolve(process.cwd(), 'data/contracts');

  private static ensureDir() {
    if (!fs.existsSync(this.contractsDir)) {
      fs.mkdirSync(this.contractsDir, { recursive: true });
    }
  }

  /**
   * Detecta o idioma do contrato baseado no país
   */
  public static resolveLanguage(country?: string, explicitLang?: ContractLanguage): ContractLanguage {
    if (explicitLang && DEFAULT_TEMPLATES_BY_LANG[explicitLang]) return explicitLang;
    if (!country) return 'BR';

    const c = country.toLowerCase();
    if (c.includes('united states') || c.includes('eua') || c.includes('usa') || c.includes('us') || c.includes('uk') || c.includes('kingdom')) {
      return 'US';
    }
    if (c.includes('espanha') || c.includes('spain') || c.includes('es')) {
      return 'ES';
    }
    if (c.includes('portugal') || c.includes('pt')) {
      return 'PT';
    }
    return 'BR';
  }

  /**
   * Obtém o modelo de contrato de acordo com o idioma selecionado
   */
  public static getContractTemplate(lang: ContractLanguage = 'BR') {
    const templateId = `tpl-contrato-${lang.toLowerCase()}`;
    try {
      const row = db.prepare('SELECT content FROM templates WHERE id = ?').get(templateId) as any;
      if (row && row.content) {
        return JSON.parse(row.content);
      }
    } catch {}

    return DEFAULT_TEMPLATES_BY_LANG[lang] || DEFAULT_TEMPLATES_BY_LANG.BR;
  }

  /**
   * Salva alterações no modelo de contrato de um idioma
   */
  public static saveContractTemplate(lang: ContractLanguage, templateData: any) {
    const templateId = `tpl-contrato-${lang.toLowerCase()}`;
    const jsonStr = JSON.stringify({ ...templateData, lang });
    db.prepare(`
      INSERT INTO templates (id, name, channel, target_country, subject, content)
      VALUES (?, ?, 'document', ?, 'Contrato de Prestação de Serviços', ?)
      ON CONFLICT(id) DO UPDATE SET content = excluded.content
    `).run(templateId, `Modelo de Contrato (${lang})`, lang, jsonStr);
    return templateData;
  }

  /**
   * Gera o arquivo PDF formatado do contrato no idioma correto
   */
  public static async generateContractPDF(data: ContractData): Promise<{
    contractId: string;
    pdfPath: string;
    pdfBuffer: Buffer;
    summaryText: string;
    language: ContractLanguage;
  }> {
    this.ensureDir();
    const lang = this.resolveLanguage(data.country, data.language);
    const template = this.getContractTemplate(lang);

    const contractId = `ctr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sanitizedName = (data.leadName || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Contrato_${lang}_${sanitizedName}_${Date.now()}.pdf`;
    const filePath = path.join(this.contractsDir, fileName);

    const price = data.totalValue || template.defaultPrice;
    const payment = data.paymentTerms || template.defaultPaymentTerms;
    const days = data.deliveryDays || template.defaultDeliveryDays;
    const providerName = data.providerName || template.providerName;
    const providerPhone = data.providerPhone || template.providerPhone;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        const fileStream = fs.createWriteStream(filePath);
        doc.pipe(fileStream);

        // Header Banner
        doc.rect(40, 40, doc.page.width - 80, 50).fill('#1e1b4b');
        doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
          .text(template.title, 50, 53, { align: 'center', width: doc.page.width - 100 });
        doc.fontSize(8.5).font('Helvetica')
          .text(lang === 'US' ? 'Professional Digital & Web Engineering Solutions' : 'Desenvolvimento de Websites & Soluções Digitais', 50, 72, { align: 'center', width: doc.page.width - 100 });

        doc.moveDown(3);
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica');

        // Labels
        const lblParties = lang === 'US' ? '1. PARTIES IDENTIFICATION:' : lang === 'ES' ? '1. IDENTIFICACIÓN DE LAS PARTES:' : '1. IDENTIFICAÇÃO DAS PARTES:';
        const lblProvider = lang === 'US' ? 'SERVICE PROVIDER:' : lang === 'ES' ? 'PRESTADOR:' : 'CONTRATADA (Prestador):';
        const lblClient = lang === 'US' ? 'CLIENT:' : lang === 'ES' ? 'CLIENTE:' : 'CONTRATANTE (Cliente):';
        const lblScope = lang === 'US' ? '2. SCOPE & COMMERCIAL TERMS:' : lang === 'ES' ? '2. ALCANCE Y TÉRMINOS COMERCIALES:' : '2. ESCOPO & CONDIÇÕES COMERCIAIS:';
        const lblClauses = lang === 'US' ? '3. CONTRACTUAL TERMS & CONDITIONS:' : lang === 'ES' ? '3. CLÁUSULAS CONTRACTUALES:' : '3. CLÁUSULAS CONTRATUAIS:';

        // Partes
        doc.font('Helvetica-Bold').text(lblParties, 40, 110);
        doc.font('Helvetica').fontSize(9)
          .text(`${lblProvider} ${providerName} | Contact: ${providerPhone}`)
          .text(`${lblClient} ${data.leadName} | Tel/WhatsApp: ${data.clientPhone} | City/Region: ${data.clientCity || 'Local'}`)
          .moveDown(1);

        // Objeto e Valores
        doc.font('Helvetica-Bold').fontSize(10).text(lblScope);
        doc.font('Helvetica').fontSize(9)
          .text(`• ${lang === 'US' ? 'Service' : 'Serviço'}: ${data.serviceTitle || template.serviceTitle}`)
          .text(`• ${lang === 'US' ? 'Total Investment' : 'Valor Total Acordado'}: ${price}`)
          .text(`• ${lang === 'US' ? 'Payment Terms' : 'Forma de Pagamento'}: ${payment}`)
          .text(`• ${lang === 'US' ? 'Estimated Delivery' : 'Prazo Estimado de Entrega'}: ${days} ${lang === 'US' ? 'business days' : 'dias úteis'}`)
          .text(`• ${lang === 'US' ? 'Warranty & Support' : 'Garantia & Suporte'}: ${lang === 'US' ? '30 days full technical support included' : '30 dias inclusos'}`)
          .moveDown(1);

        // Cláusulas
        doc.font('Helvetica-Bold').fontSize(10).text(lblClauses);
        doc.font('Helvetica').fontSize(8.5);

        template.clauses.forEach((clause: string) => {
          doc.text(clause, { align: 'justify', lineGap: 2 }).moveDown(0.6);
        });

        // Signatures
        doc.moveDown(2);
        const currentY = doc.y;
        doc.rect(40, currentY, (doc.page.width - 100) / 2, 45).stroke('#cbd5e1');
        doc.rect(doc.page.width / 2 + 10, currentY, (doc.page.width - 100) / 2, 45).stroke('#cbd5e1');

        doc.fontSize(8).font('Helvetica-Bold')
          .text(lblProvider, 50, currentY + 8)
          .font('Helvetica').text(providerName, 50, currentY + 22)
          .text(lang === 'US' ? 'Digital Acceptance Confirmed' : 'Aceite Digital Confirmado', 50, currentY + 32);

        doc.fontSize(8).font('Helvetica-Bold')
          .text(lblClient, doc.page.width / 2 + 20, currentY + 8)
          .font('Helvetica').text(data.leadName, doc.page.width / 2 + 20, currentY + 22)
          .text(lang === 'US' ? 'Accepted via WhatsApp' : 'Aceite via WhatsApp', doc.page.width / 2 + 20, currentY + 32);

        doc.end();

        fileStream.on('finish', () => {
          const pdfBuffer = Buffer.concat(buffers);

          // Save in SQLite database
          db.prepare(`
            INSERT INTO contracts (
              id, lead_id, lead_name, client_phone, service_title, total_value, payment_terms, delivery_days, pdf_path, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'enviado', CURRENT_TIMESTAMP)
          `).run(
            contractId,
            data.leadId,
            data.leadName,
            data.clientPhone,
            data.serviceTitle || template.serviceTitle,
            price,
            payment,
            days,
            filePath
          );

          let summaryText = '';
          if (lang === 'US') {
            summaryText = `📄 *SERVICE AGREEMENT & CONTRACT ATTACHED*

Hello *${data.leadName}*! As discussed, here is our formal Web Development & Digital Solutions contract.

📋 *Project Overview:*
• *Service:* ${data.serviceTitle || template.serviceTitle}
• *Total Investment:* ${price}
• *Payment Terms:* ${payment}
• *Delivery Timeline:* ${days} business days
• *Warranty:* 30 days full technical support

The official PDF document with all clauses and terms is attached. Simply reply with *"Confirmed"* or *"Agreed"* to get our team started right away! 🤝`;
          } else if (lang === 'ES') {
            summaryText = `📄 *CONTRATO DE PRESTACIÓN DE SERVICIOS ADJUNTO*

¡Hola, *${data.leadName}*! Conforme a lo acordado, aquí tiene el contrato formal de desarrollo web.

📋 *Resumen del Proyecto:*
• *Servicio:* ${data.serviceTitle || template.serviceTitle}
• *Inversión Total:* ${price}
• *Condiciones de Pago:* ${payment}
• *Plazo de Entrega:* ${days} días hábiles
• *Garantía:* 30 días de soporte técnico completo

El documento oficial en PDF con todos los términos legales está adjunto. ¡Solo responda con un *"De acuerdo"* para iniciar el desarrollo! 🤝`;
          } else {
            summaryText = `📄 *CONTRATO DE PRESTAÇÃO DE SERVIÇOS GERADO*

Olá, *${data.leadName}*! Conforme combinamos, segue o nosso contrato formal de desenvolvimento web.

📋 *Resumo do Projeto:*
• *Serviço:* ${data.serviceTitle || template.serviceTitle}
• *Valor Total:* ${price}
• *Condições:* ${payment}
• *Prazo de Entrega:* ${days} dias úteis
• *Garantia:* 30 dias de suporte completo

O documento oficial em PDF com todos os termos e garantias está anexo. Para darmos início ao desenvolvimento, basta responder com um *"De acordo"* ou *"Confirmado"* por aqui! 🤝`;
          }

          resolve({
            contractId,
            pdfPath: filePath,
            pdfBuffer,
            summaryText,
            language: lang
          });
        });

        fileStream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }
}
