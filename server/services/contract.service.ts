import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { db } from '../db/database.js';

export interface ContractData {
  leadId: string;
  leadName: string;
  clientPhone: string;
  clientAddress?: string;
  clientCity?: string;
  serviceTitle?: string;
  totalValue?: string;
  paymentTerms?: string;
  deliveryDays?: number;
  providerName?: string;
  providerPhone?: string;
  providerDoc?: string;
}

export class ContractService {
  private static contractsDir = path.resolve(process.cwd(), 'data/contracts');

  private static ensureDir() {
    if (!fs.existsSync(this.contractsDir)) {
      fs.mkdirSync(this.contractsDir, { recursive: true });
    }
  }

  /**
   * Obtém as configurações e modelo de contrato padrão
   */
  public static getContractTemplate() {
    try {
      const row = db.prepare('SELECT content FROM templates WHERE id = ?').get('tpl-contrato-padrao') as any;
      if (row && row.content) {
        return JSON.parse(row.content);
      }
    } catch {}

    return {
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
    };
  }

  /**
   * Salva alterações no modelo de contrato padrão
   */
  public static saveContractTemplate(templateData: any) {
    const jsonStr = JSON.stringify(templateData);
    db.prepare(`
      INSERT INTO templates (id, name, channel, target_country, subject, content)
      VALUES ('tpl-contrato-padrao', 'Modelo de Contrato Padrão', 'document', 'BR', 'Contrato de Prestação de Serviços', ?)
      ON CONFLICT(id) DO UPDATE SET content = excluded.content
    `).run(jsonStr);
    return templateData;
  }

  /**
   * Gera o arquivo PDF formatado do contrato
   */
  public static async generateContractPDF(data: ContractData): Promise<{
    contractId: string;
    pdfPath: string;
    pdfBuffer: Buffer;
    summaryText: string;
  }> {
    this.ensureDir();
    const template = this.getContractTemplate();

    const contractId = `ctr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sanitizedName = (data.leadName || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Contrato_${sanitizedName}_${Date.now()}.pdf`;
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

        // Header
        doc.rect(40, 40, doc.page.width - 80, 50).fill('#1e1b4b');
        doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
          .text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS WEB', 50, 55, { align: 'center', width: doc.page.width - 100 });
        doc.fontSize(9).font('Helvetica').text('Desenvolvimento de Websites & Soluções Digitais', 50, 72, { align: 'center', width: doc.page.width - 100 });

        doc.moveDown(3);
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica');

        // Partes
        doc.font('Helvetica-Bold').text('1. IDENTIFICAÇÃO DAS PARTES:', 40, 110);
        doc.font('Helvetica').fontSize(9)
          .text(`CONTRATADA (Prestador): ${providerName} | Contato: ${providerPhone}`)
          .text(`CONTRATANTE (Cliente): ${data.leadName} | Telefone/WhatsApp: ${data.clientPhone} | Cidade: ${data.clientCity || 'Região Comercial'}`)
          .moveDown(1);

        // Objeto e Valores
        doc.font('Helvetica-Bold').fontSize(10).text('2. ESCOPO & CONDIÇÕES COMERCIAIS:');
        doc.font('Helvetica').fontSize(9)
          .text(`• Serviço: ${data.serviceTitle || template.serviceTitle}`)
          .text(`• Valor Total Acordado: ${price}`)
          .text(`• Forma de Pagamento: ${payment}`)
          .text(`• Prazo Estimado de Entrega: ${days} dias úteis`)
          .text(`• Garantia & Suporte Pós-Entrega: 30 dias inclusos`)
          .moveDown(1);

        // Cláusulas
        doc.font('Helvetica-Bold').fontSize(10).text('3. CLÁUSULAS CONTRATUAIS:');
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
          .text('CONTRATADA (Prestador):', 50, currentY + 8)
          .font('Helvetica').text(providerName, 50, currentY + 22)
          .text('Aceite Digital Confirmado', 50, currentY + 32);

        doc.fontSize(8).font('Helvetica-Bold')
          .text('CONTRATANTE (Cliente):', doc.page.width / 2 + 20, currentY + 8)
          .font('Helvetica').text(data.leadName, doc.page.width / 2 + 20, currentY + 22)
          .text('Aceite via WhatsApp', doc.page.width / 2 + 20, currentY + 32);

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

          const summaryText = `📄 *CONTRATO DE PRESTAÇÃO DE SERVIÇOS GERADO*

Olá, *${data.leadName}*! Conforme combinamos, segue o nosso contrato formal de desenvolvimento web.

📋 *Resumo do Projeto:*
• *Serviço:* ${data.serviceTitle || template.serviceTitle}
• *Valor Total:* ${price}
• *Condições:* ${payment}
• *Prazo de Entrega:* ${days} dias úteis
• *Garantia:* 30 dias de suporte completo

O documento oficial em PDF com todos os termos e garantias está anexo. Para darmos início ao desenvolvimento, basta responder com um *"De acordo"* ou *"Confirmado"* por aqui! 🤝`;

          resolve({
            contractId,
            pdfPath: filePath,
            pdfBuffer,
            summaryText
          });
        });

        fileStream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }
}
