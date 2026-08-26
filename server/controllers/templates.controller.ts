import { Request, Response } from 'express';
import { db } from '../db/database.js';
import { renderOutreachTemplate } from '../services/outreach.service.js';
import crypto from 'crypto';

export class TemplatesController {
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const templates = db.prepare('SELECT * FROM templates ORDER BY created_at ASC').all();
      res.json(templates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, channel, target_country, subject, content } = req.body;

      if (!name || !content || !channel) {
        res.status(400).json({ error: 'Nome, canal e conteúdo são obrigatórios.' });
        return;
      }

      const id = 'tpl-' + crypto.randomUUID().substring(0, 8);
      const stmt = db.prepare(`
        INSERT INTO templates (id, name, channel, target_country, subject, content)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, name, channel, target_country || 'ALL', subject || '', content);

      const created = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, channel, target_country, subject, content } = req.body;

      const stmt = db.prepare(`
        UPDATE templates
        SET name = ?, channel = ?, target_country = ?, subject = ?, content = ?
        WHERE id = ?
      `);

      const result = stmt.run(name, channel, target_country || 'ALL', subject || '', content, id);

      if (result.changes === 0) {
        res.status(404).json({ error: 'Modelo não encontrado.' });
        return;
      }

      const updated = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async deleteOne(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM templates WHERE id = ?').run(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async render(req: Request, res: Response): Promise<void> {
    try {
      const { templateId, templateContent, templateSubject, lead, senderName } = req.body;

      if (!lead) {
        res.status(400).json({ error: 'Dados do lead são obrigatórios para renderizar a mensagem.' });
        return;
      }

      let contentToUse = templateContent;
      let subjectToUse = templateSubject;

      if (templateId && !contentToUse) {
        const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId) as any;
        if (tpl) {
          contentToUse = tpl.content;
          subjectToUse = tpl.subject;
        }
      }

      if (!contentToUse) {
        res.status(400).json({ error: 'Conteúdo do template não fornecido ou não encontrado.' });
        return;
      }

      const rendered = renderOutreachTemplate(
        contentToUse,
        subjectToUse,
        lead,
        senderName || 'Desenvolvedor de Sistemas Web'
      );

      res.json(rendered);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
