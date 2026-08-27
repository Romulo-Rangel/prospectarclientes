import { Request, Response } from 'express';
import { ContractService } from '../services/contract.service.js';
import { WhatsAppSocketService } from '../services/whatsapp-socket.service.js';
import { db } from '../db/database.js';
import fs from 'fs';

export class ContractController {

  public static getTemplate(req: Request, res: Response) {
    try {
      const template = ContractService.getContractTemplate();
      res.json(template);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static saveTemplate(req: Request, res: Response) {
    try {
      const updated = ContractService.saveContractTemplate(req.body);
      res.json({ success: true, template: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static getContractsList(req: Request, res: Response) {
    try {
      const list = db.prepare('SELECT * FROM contracts ORDER BY created_at DESC').all();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async generateContract(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const { customPrice, customTerms, customDays } = req.body;

      const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
      if (!lead) {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }

      const result = await ContractService.generateContractPDF({
        leadId: lead.id,
        leadName: lead.name,
        clientPhone: lead.formatted_phone || lead.phone,
        clientCity: lead.city,
        totalValue: customPrice,
        paymentTerms: customTerms,
        deliveryDays: customDays
      });

      res.json({
        success: true,
        contractId: result.contractId,
        pdfUrl: `/api/contracts/download/${result.contractId}`,
        summaryText: result.summaryText
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static downloadContractPDF(req: Request, res: Response) {
    try {
      const { contractId } = req.params;
      const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId) as any;
      if (!contract || !contract.pdf_path || !fs.existsSync(contract.pdf_path)) {
        return res.status(404).json({ error: 'Arquivo do contrato não encontrado' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Contrato_${contract.lead_name}.pdf"`);
      fs.createReadStream(contract.pdf_path).pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async sendContractToLead(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
      if (!lead) {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }

      const phone = lead.formatted_phone || lead.phone;
      if (!phone) {
        return res.status(400).json({ error: 'Lead não possui telefone/WhatsApp cadastrado' });
      }

      // Generate PDF
      const result = await ContractService.generateContractPDF({
        leadId: lead.id,
        leadName: lead.name,
        clientPhone: phone,
        clientCity: lead.city
      });

      // Send via WhatsApp
      const sendRes = await WhatsAppSocketService.sendDocument(
        phone,
        result.pdfBuffer,
        `Contrato_${lead.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        result.summaryText,
        lead.id,
        lead.name
      );

      if (!sendRes.success) {
        return res.status(400).json(sendRes);
      }

      res.json({ success: true, message: 'Contrato enviado com sucesso no WhatsApp do cliente!' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
