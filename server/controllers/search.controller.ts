import { Request, Response } from 'express';
import { ScraperService } from '../services/scraper.service.js';
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
      const { niche, city, country, limit, onlyWithoutWebsite, requirePhone } = req.body;

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

      res.json({
        success: true,
        total: leads.length,
        leads
      });
    } catch (err: any) {
      console.error('Erro na rota de busca:', err);
      broadcastSSE('error', { message: err.message || 'Erro durante a busca.' });
      res.status(500).json({ error: err.message || 'Erro interno ao realizar busca' });
    }
  }

  public static history(req: Request, res: Response): void {
    try {
      const history = db.prepare('SELECT * FROM searches ORDER BY created_at DESC LIMIT 10').all();
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
