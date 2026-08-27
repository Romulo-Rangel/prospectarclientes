import crypto from 'crypto';
import { db } from '../db/database.js';
import { ScraperService } from './scraper.service.js';
import { renderOutreachTemplate } from './outreach.service.js';
import { BusinessHoursService } from './business-hours.service.js';

export interface AutopilotConfig {
  dailyQuota: number;
  autoRunEnabled: boolean;
  targetCountry: string;
  senderName: string;
  senderPhone: string;
  targetCities: string[];
  targetNiches: string[];
}

export const MARKET_PRESETS: Record<string, { country: string; cities: string[]; niches: string[]; defaultTemplateId: string }> = {
  'USA': {
    country: 'Estados Unidos',
    cities: ['Miami', 'Orlando', 'New York', 'Los Angeles', 'Houston', 'Austin', 'Chicago', 'San Francisco', 'Boston', 'Dallas', 'Atlanta', 'Las Vegas'],
    niches: ['Restaurants', 'Dental Clinics', 'Auto Repair', 'Hair Salons', 'Real Estate', 'Accounting', 'Gyms', 'Pet Grooming', 'Pizzerias', 'Lawyers'],
    defaultTemplateId: 'tpl-wa-us-no-website'
  },
  'Portugal': {
    country: 'Portugal',
    cities: ['Lisboa', 'Porto', 'Braga', 'Coimbra', 'Faro', 'Cascais', 'Sintra', 'Setúbal', 'Funchal', 'Vila Nova de Gaia', 'Aveiro', 'Guimarães'],
    niches: ['Restaurantes', 'Clínicas Dentárias', 'Oficinas Mecânicas', 'Cabeleireiros', 'Imobiliárias', 'Contabilidade', 'Alojamento Local', 'Ginásios', 'Pet Shops', 'Pizzarias'],
    defaultTemplateId: 'tpl-wa-pt-sem-site'
  },
  'Espanha': {
    country: 'Espanha',
    cities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga', 'Bilbao', 'Alicante', 'Zaragoza', 'Granada', 'Palma de Mallorca'],
    niches: ['Restaurantes', 'Clínicas Dentales', 'Talleres Mecánicos', 'Peluquerías', 'Inmobiliarias', 'Gimnasios', 'Asesoría y Gestoría', 'Pizzerías'],
    defaultTemplateId: 'tpl-wa-es-sin-sitio'
  },
  'Reino Unido': {
    country: 'Reino Unido',
    cities: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Liverpool', 'Bristol', 'Leeds'],
    niches: ['Restaurants', 'Dental Practices', 'Auto Garages', 'Hair & Beauty Salons', 'Estate Agents', 'Accounting', 'Gyms', 'Pet Shops'],
    defaultTemplateId: 'tpl-wa-us-no-website'
  },
  'Brasil': {
    country: 'Brasil',
    cities: ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'São Paulo', 'Campinas', 'Curitiba', 'Rio de Janeiro', 'Belo Horizonte', 'Florianópolis'],
    niches: ['Restaurantes', 'Clínicas Odontológicas', 'Oficinas Mecânicas', 'Salões de Beleza', 'Contabilidade', 'Imobiliárias', 'Pizzarias', 'Academias', 'Pet Shops', 'Hamburguerias'],
    defaultTemplateId: 'tpl-wa-br-sem-site'
  }
};

export class DailyHunterService {
  public static getSettings(): AutopilotConfig {
    const row = db.prepare("SELECT * FROM autopilot_settings WHERE id = 'default'").get() as any;
    const defaultMarket = MARKET_PRESETS['USA'];
    return {
      dailyQuota: row?.daily_quota || 10,
      autoRunEnabled: Boolean(row?.auto_run_enabled),
      targetCountry: row?.target_country || 'Estados Unidos',
      senderName: row?.sender_name || 'Rômulo',
      senderPhone: row?.sender_phone || '(27) 98817-2973',
      targetCities: row?.target_cities ? JSON.parse(row.target_cities) : defaultMarket.cities,
      targetNiches: row?.target_niches ? JSON.parse(row.target_niches) : defaultMarket.niches
    };
  }

  public static updateSettings(config: Partial<AutopilotConfig>): void {
    const current = this.getSettings();
    const updated = { ...current, ...config };

    db.prepare(`
      UPDATE autopilot_settings
      SET daily_quota = ?, auto_run_enabled = ?, target_country = ?, sender_name = ?, sender_phone = ?, target_cities = ?, target_niches = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 'default'
    `).run(
      updated.dailyQuota,
      updated.autoRunEnabled ? 1 : 0,
      updated.targetCountry,
      updated.senderName,
      updated.senderPhone,
      JSON.stringify(updated.targetCities),
      JSON.stringify(updated.targetNiches)
    );
  }

  public static setMarketPreset(marketName: keyof typeof MARKET_PRESETS): void {
    const preset = MARKET_PRESETS[marketName] || MARKET_PRESETS['USA'];
    this.updateSettings({
      targetCountry: preset.country,
      targetCities: preset.cities,
      targetNiches: preset.niches
    });
  }

  public static getTodayDispatchedCount(): number {
    const today = new Date().toISOString().split('T')[0];
    const row = db.prepare('SELECT count(*) as count FROM autopilot_logs WHERE date = ?').get(today) as any;
    return row?.count || 0;
  }

  public static getRecentLogs(limit: number = 20): any[] {
    return db.prepare('SELECT * FROM autopilot_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  }

  /**
   * Execute automated daily hunt targeting up to 10 American or European businesses with highest opportunity score
   */
  public static async executeDailyHunt(forceCount?: number, targetMarket?: string): Promise<{ totalHunted: number; leads: any[] }> {
    if (targetMarket && MARKET_PRESETS[targetMarket]) {
      this.setMarketPreset(targetMarket as any);
    }

    const settings = this.getSettings();
    const today = new Date().toISOString().split('T')[0];
    const todayCount = this.getTodayDispatchedCount();
    const quota = forceCount || settings.dailyQuota;

    const remainingQuota = settings.dailyQuota - todayCount;
    if (remainingQuota <= 0) {
      return { totalHunted: 0, leads: [] };
    }

    // Checa jornada de trabalho comercial e horário de almoço
    const bh = BusinessHoursService.checkCurrentStatus();
    if (!bh.isWorkingTime && bh.respectBusinessHours) {
      console.log(`⏸️ [Robô Caçador] Pausado: ${bh.statusText}. Respeitando jornada comercial de 8h e almoço.`);
      return { 
        totalHunted: 0, 
        leads: []
      };
    }

    // Pick random niche and city from rotation pool
    const randomNiche = settings.targetNiches[Math.floor(Math.random() * settings.targetNiches.length)];
    const randomCity = settings.targetCities[Math.floor(Math.random() * settings.targetCities.length)];

    console.log(`🤖 [Caçador Internacional] Iniciando varredura para ${randomNiche} em ${randomCity}, ${settings.targetCountry} (${remainingQuota} alvos)...`);

    // Search qualified prospects: strictly with phone, and prioritizing NO WEBSITE
    let discovered = await ScraperService.searchProspects({
      niche: randomNiche,
      city: randomCity,
      country: settings.targetCountry,
      limit: Math.max(remainingQuota * 2, 15),
      onlyWithoutWebsite: true,
      requirePhone: true
    });

    // Fallback: If strict 'onlyWithoutWebsite' didn't yield enough, search without the restriction but keeping requirePhone
    if (discovered.length < remainingQuota) {
      const fallbackResults = await ScraperService.searchProspects({
        niche: randomNiche,
        city: randomCity,
        country: settings.targetCountry,
        limit: Math.max(remainingQuota * 2, 15),
        onlyWithoutWebsite: false,
        requirePhone: true
      });

      for (const item of fallbackResults) {
        if (!discovered.some(d => d.id === item.id)) {
          discovered.push(item);
        }
      }
    }

    // Pick template by country
    let targetCountryCode = 'US';
    if (settings.targetCountry === 'Portugal') targetCountryCode = 'PT';
    else if (settings.targetCountry === 'Espanha') targetCountryCode = 'ES';
    else if (settings.targetCountry === 'Brasil') targetCountryCode = 'BR';

    let template = db.prepare("SELECT * FROM templates WHERE target_country = ? LIMIT 1").get(targetCountryCode) as any;
    if (!template) {
      template = db.prepare("SELECT * FROM templates WHERE channel = 'whatsapp' LIMIT 1").get() as any;
    }

    const templateContent = template?.content || `Hello! My name is {{meu_nome}} and I build websites and web systems for businesses in {{cidade}}.

I noticed that *{{empresa}}* does not have an official website listed on Google yet.

A modern website helps drive more customers and orders. Would you be open to a quick proposal for *{{empresa}}*?
WhatsApp: {{meu_telefone}}`;

    const targetedLeads: any[] = [];
    const insertLog = db.prepare(`
      INSERT INTO autopilot_logs (id, date, lead_id, lead_name, niche, city, phone, message_preview, whatsapp_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'enviado')
    `);

    for (const lead of discovered.slice(0, remainingQuota)) {
      const rendered = renderOutreachTemplate(
        templateContent,
        '',
        lead,
        settings.senderName,
        settings.senderPhone
      );

      const logId = 'auto-' + crypto.randomUUID().substring(0, 10);
      insertLog.run(
        logId,
        today,
        lead.id,
        lead.name,
        lead.category || randomNiche,
        lead.city || randomCity,
        lead.phone,
        rendered.message,
        rendered.whatsappUrl || ''
      );

      // Update lead status to contatado
      db.prepare("UPDATE leads SET status = 'contatado', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(lead.id);

      targetedLeads.push({
        ...lead,
        renderedMessage: rendered.message,
        whatsappUrl: rendered.whatsappUrl
      });
    }

    console.log(`✅ [Caçador Internacional] ${targetedLeads.length} empresas identificadas em ${settings.targetCountry}!`);
    return { totalHunted: targetedLeads.length, leads: targetedLeads };
  }
}
