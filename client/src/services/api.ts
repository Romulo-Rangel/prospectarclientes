import { Lead, Template, Stats, SearchParams } from '../types.js';

const API_BASE = '/api';

export const api = {
  async getLeads(filters?: {
    status?: string;
    lead_score?: string;
    has_website?: string;
    country?: string;
    city?: string;
    search?: string;
  }): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== '') params.append(key, val);
      });
    }
    const res = await fetch(`${API_BASE}/leads?${params.toString()}`);
    if (!res.ok) throw new Error('Erro ao carregar leads');
    return res.json();
  },

  async getStats(): Promise<Stats> {
    const res = await fetch(`${API_BASE}/leads/stats`);
    if (!res.ok) throw new Error('Erro ao carregar estatísticas');
    return res.json();
  },

  async updateLeadStatus(id: string, status: Lead['status']): Promise<void> {
    const res = await fetch(`${API_BASE}/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Erro ao atualizar status');
  },

  async updateLeadNotes(id: string, notes: string): Promise<void> {
    const res = await fetch(`${API_BASE}/leads/${id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) throw new Error('Erro ao atualizar anotações');
  },

  async deleteLead(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/leads/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao deletar lead');
  },

  async clearAllLeads(): Promise<void> {
    const res = await fetch(`${API_BASE}/leads/batch/clear`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao limpar leads');
  },

  async runSearch(params: SearchParams): Promise<{ total: number; leads: Lead[] }> {
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao realizar busca');
    }
    return res.json();
  },

  async getTemplates(): Promise<Template[]> {
    const res = await fetch(`${API_BASE}/templates`);
    if (!res.ok) throw new Error('Erro ao carregar templates');
    return res.json();
  },

  async createTemplate(template: Omit<Template, 'id' | 'created_at'>): Promise<Template> {
    const res = await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    if (!res.ok) throw new Error('Erro ao criar template');
    return res.json();
  },

  async updateTemplate(id: string, template: Partial<Template>): Promise<Template> {
    const res = await fetch(`${API_BASE}/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    if (!res.ok) throw new Error('Erro ao atualizar template');
    return res.json();
  },

  async deleteTemplate(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/templates/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao deletar template');
  },

  async renderTemplate(payload: {
    templateId?: string;
    templateContent?: string;
    templateSubject?: string;
    lead: Partial<Lead>;
    senderName?: string;
  }): Promise<{ message: string; subject?: string; whatsappUrl?: string; mailtoUrl?: string }> {
    const res = await fetch(`${API_BASE}/templates/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Erro ao renderizar template');
    return res.json();
  },

  getExportCsvUrl(): string {
    return `${API_BASE}/leads/export/csv`;
  }
};
