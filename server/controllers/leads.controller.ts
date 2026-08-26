import { Request, Response } from 'express';
import { db } from '../db/database.js';

export class LeadsController {
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const { status, lead_score, has_website, country, city, search, sort_by, sort_order } = req.query;

      let query = 'SELECT * FROM leads WHERE 1=1';
      const params: any[] = [];

      if (status && status !== 'todos') {
        query += ' AND status = ?';
        params.push(status);
      }

      if (lead_score && lead_score !== 'todos') {
        query += ' AND lead_score = ?';
        params.push(lead_score);
      }

      if (has_website !== undefined && has_website !== 'todos') {
        query += ' AND has_website = ?';
        params.push(has_website === 'true' || has_website === '1' ? 1 : 0);
      }

      if (country && country !== 'todos') {
        query += ' AND country = ?';
        params.push(country);
      }

      if (city) {
        query += ' AND city LIKE ?';
        params.push(`%${city}%`);
      }

      if (search) {
        query += ' AND (name LIKE ? OR category LIKE ? OR address LIKE ? OR phone LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      const orderField = sort_by === 'rating' ? 'rating' : sort_by === 'name' ? 'name' : 'created_at';
      const orderDir = sort_order === 'asc' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${orderField} ${orderDir}`;

      const leads = db.prepare(query).all(...params).map((row: any) => ({
        ...row,
        opportunity_tags: row.opportunity_tags ? JSON.parse(row.opportunity_tags) : []
      }));

      res.json(leads);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const totalLeads = (db.prepare('SELECT count(*) as count FROM leads').get() as any).count;
      const withoutWebsite = (db.prepare('SELECT count(*) as count FROM leads WHERE has_website = 0').get() as any).count;
      const highOpportunity = (db.prepare("SELECT count(*) as count FROM leads WHERE lead_score = 'Alta'").get() as any).count;
      const contacted = (db.prepare("SELECT count(*) as count FROM leads WHERE status = 'contatado'").get() as any).count;
      const negotiating = (db.prepare("SELECT count(*) as count FROM leads WHERE status = 'em_negociacao'").get() as any).count;
      const converted = (db.prepare("SELECT count(*) as count FROM leads WHERE status = 'convertido'").get() as any).count;
      const discarded = (db.prepare("SELECT count(*) as count FROM leads WHERE status = 'descartado'").get() as any).count;

      const conversionRate = totalLeads > 0 ? Number(((converted / totalLeads) * 100).toFixed(1)) : 0;

      const countries = db.prepare('SELECT country, count(*) as count FROM leads GROUP BY country ORDER BY count DESC LIMIT 8').all();
      const categories = db.prepare('SELECT category, count(*) as count FROM leads GROUP BY category ORDER BY count DESC LIMIT 8').all();

      res.json({
        totalLeads,
        withoutWebsite,
        highOpportunity,
        contacted,
        negotiating,
        converted,
        discarded,
        conversionRate,
        countries,
        categories
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['novo', 'contatado', 'em_negociacao', 'convertido', 'descartado'].includes(status)) {
        res.status(400).json({ error: 'Status inválido.' });
        return;
      }

      const stmt = db.prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const result = stmt.run(status, id);

      if (result.changes === 0) {
        res.status(404).json({ error: 'Lead não encontrado.' });
        return;
      }

      res.json({ success: true, id, status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async updateNotes(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const stmt = db.prepare('UPDATE leads SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(notes || '', id);

      res.json({ success: true, id, notes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async deleteOne(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM leads WHERE id = ?').run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async clearAll(req: Request, res: Response): Promise<void> {
    try {
      db.prepare('DELETE FROM leads').run();
      res.json({ success: true, message: 'Todos os leads foram removidos.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async exportCsv(req: Request, res: Response): Promise<void> {
    try {
      const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();

      const headers = ['ID', 'Nome', 'Categoria', 'Cidade', 'País', 'Telefone', 'WhatsApp_Link', 'Website', 'Tem_Site', 'Status_Site', 'Lead_Score', 'Status_Contato', 'Oportunidades', 'Criado_Em'];
      
      const rows = leads.map((l: any) => {
        const waLink = l.formatted_phone ? `https://wa.me/${l.formatted_phone}` : '';
        return [
          `"${l.id}"`,
          `"${(l.name || '').replace(/"/g, '""')}"`,
          `"${(l.category || '').replace(/"/g, '""')}"`,
          `"${(l.city || '').replace(/"/g, '""')}"`,
          `"${(l.country || '').replace(/"/g, '""')}"`,
          `"${l.phone || ''}"`,
          `"${waLink}"`,
          `"${l.website || ''}"`,
          l.has_website ? 'Sim' : 'Não',
          `"${l.website_status || ''}"`,
          `"${l.lead_score || ''}"`,
          `"${l.status || ''}"`,
          `"${(l.opportunity_tags || '').replace(/"/g, '""')}"`,
          `"${l.created_at || ''}"`
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="prospects_leads.csv"');
      res.send(csvContent);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
