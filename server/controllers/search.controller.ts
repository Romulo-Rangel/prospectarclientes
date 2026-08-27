import { Request, Response } from 'express';
import { ScraperService } from '../services/scraper.service.js';
import { WhatsAppSocketService } from '../services/whatsapp-socket.service.js';
import { AIBrainService } from '../services/ai-brain.service.js';
import { db } from '../db/database.js';

// Store active SSE clients
const sseClients = new Set<(data: string) => void>();

export function broadcastSSE(event: string, payload: any) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client(msg);
    } catch {}
  }
}

export class SearchController {
  public static stream(req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (msg: string) => res.write(msg);
    sseClients.add(send);

    req.on('close', () => {
      sseClients.delete(send);
    });
  }

  public static async execute(req: Request, res: Response): Promise<void> {
    try {
      const { niche, city, country, limit, onlyWithoutWebsite, requirePhone, autoDispatch } = req.body;

      if (!niche || !city) {
        res.status(400).json({ error: 'Nicho e Cidade são obrigatórios.' });
        return;
      }

      const targetCountry = country || 'Brasil';
      const targetLimit = parseInt(limit, 10) || 20;

      broadcastSSE('start', { niche, city, country: targetCountry, limit: targetLimit });

      const leads = await ScraperService.searchProspects(
        {
          niche,
          city,
          country: targetCountry,
          limit: targetLimit,
          onlyWithoutWebsite: Boolean(onlyWithoutWebsite),
          requirePhone: requirePhone !== undefined ? Boolean(requirePhone) : true
        },
        (msg, current, total, lead) => {
          broadcastSSE('progress', { message: msg, current, total, lead });
        }
      );

      broadcastSSE('done', { total: leads.length });

      // Se o usuário solicitou autoDispatch (Disparo Automático Imediato)
      let dispatchScheduled = 0;
      if (autoDispatch) {
        const validLeads = leads.filter(l => l.formatted_phone || (l.phone && l.phone.replace(/\D/g, '').length >= 8));
        dispatchScheduled = validLeads.length;

        // Disparo assíncrono em segundo plano com delay anti-ban
        (async () => {
          console.log(`🚀 [Auto-Disparo Imediato] Iniciando envio automático para ${validLeads.length} leads qualificados...`);
          for (let i = 0; i < validLeads.length; i++) {
            const lead = validLeads[i];
            const phone = lead.formatted_phone || lead.phone;
            const message = AIBrainService.generateInitialPitch(lead, 'Rômulo', '(27) 98817-2973');

            try {
              const res = await WhatsAppSocketService.sendTextMessage(phone, message, lead.id, lead.name);
              if (res.success) {
                db.prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                  .run('contatado', lead.id);
                broadcastSSE('dispatch_step', { current: i + 1, total: validLeads.length, leadName: lead.name });
              }
            } catch (err: any) {
              console.warn(`Erro no auto-disparo para ${lead.name}:`, err.message);
            }

            // Intervalo humano seguro entre envios (12s a 20s)
            if (i < validLeads.length - 1) {
              const delay = Math.floor(Math.random() * (20000 - 12000 + 1) + 12000);
              await new Promise(r => setTimeout(r, delay));
            }
          }
          console.log(`✅ [Auto-Disparo Imediato] Finalizado envio de ${validLeads.length} leads!`);
        })();
      }

      res.json({
        success: true,
        total: leads.length,
        dispatchScheduled,
        leads
      });
    } catch (err: any) {
      console.error('Erro na rota de busca:', err);
      broadcastSSE('error', { message: err.message || 'Erro durante a busca.' });
      res.status(500).json({ error: err.message || 'Erro interno ao realizar busca' });
    }
  }

  public static getHistory(req: Request, res: Response): void {
    try {
      const searches = db.prepare('SELECT * FROM searches ORDER BY created_at DESC LIMIT 10').all();
      res.json(searches);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
