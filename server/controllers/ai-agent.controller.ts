import { Request, Response } from 'express';
import { WhatsAppSocketService } from '../services/whatsapp-socket.service.js';
import { BusinessHoursService } from '../services/business-hours.service.js';
import { db } from '../db/database.js';

export class AIAgentController {

  public static getStatus(req: Request, res: Response) {
    try {
      const status = WhatsAppSocketService.getStatus();
      
      // Calculate real statistics
      const stats = db.prepare(`
        SELECT 
          COUNT(DISTINCT phone) as totalConversations,
          SUM(CASE WHEN ai_decision = 'interessado_fechar' THEN 1 ELSE 0 END) as closingDeals,
          SUM(CASE WHEN ai_decision = 'negociando' THEN 1 ELSE 0 END) as negotiatingDeals,
          SUM(CASE WHEN ai_decision = 'recusou' THEN 1 ELSE 0 END) as rejectedDeals,
          COUNT(*) as totalMessages
        FROM chat_messages
      `).get() as any;

      res.json({
        ...status,
        stats: stats || { totalConversations: 0, closingDeals: 0, negotiatingDeals: 0, rejectedDeals: 0, totalMessages: 0 }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async connect(req: Request, res: Response) {
    try {
      await WhatsAppSocketService.initSocket(true);
      res.json({ success: true, message: 'Inicializando conexão com WhatsApp e gerando QR Code...' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async disconnect(req: Request, res: Response) {
    try {
      const result = await WhatsAppSocketService.logout();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static toggleAutoReply(req: Request, res: Response) {
    try {
      const { enabled } = req.body;
      WhatsAppSocketService.setAutoReplyEnabled(Boolean(enabled));
      res.json({ success: true, isAutoReplyEnabled: Boolean(enabled) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static getConversations(req: Request, res: Response) {
    try {
      const conversations = db.prepare(`
        SELECT 
          c.lead_id,
          c.lead_name,
          c.phone,
          (SELECT message FROM chat_messages WHERE phone = c.phone ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT sender FROM chat_messages WHERE phone = c.phone ORDER BY created_at DESC LIMIT 1) as last_sender,
          (SELECT ai_decision FROM chat_messages WHERE phone = c.phone AND ai_decision IS NOT NULL ORDER BY created_at DESC LIMIT 1) as latest_ai_decision,
          MAX(c.created_at) as last_activity,
          COUNT(*) as message_count
        FROM chat_messages c
        GROUP BY c.phone
        ORDER BY last_activity DESC
      `).all();

      res.json(conversations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static getConversationThread(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const messages = db.prepare(`
        SELECT * FROM chat_messages
        WHERE lead_id = ? OR phone = ?
        ORDER BY created_at ASC
      `).all(leadId, leadId);

      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async sendMessage(req: Request, res: Response) {
    try {
      const { phone, text, leadId, leadName } = req.body;
      if (!phone || !text) {
        return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
      }

      const result = await WhatsAppSocketService.sendTextMessage(phone, text, leadId, leadName);
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static getBusinessHours(req: Request, res: Response) {
    try {
      const status = BusinessHoursService.checkCurrentStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static saveBusinessHours(req: Request, res: Response) {
    try {
      const updated = BusinessHoursService.saveSettings(req.body);
      const status = BusinessHoursService.checkCurrentStatus();
      res.json({ success: true, ...status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
