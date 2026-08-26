import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { auditWebsite } from './auditor.service.js';
import { formatPhoneNumber } from './outreach.service.js';
import { db } from '../db/database.js';

export interface ScrapeParams {
  niche: string;
  city: string;
  country: string;
  limit?: number;
  onlyWithoutWebsite?: boolean;
  requirePhone?: boolean;
}

export interface RawProspect {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  mapsUrl?: string;
  source: string;
}

// Country code mapping for geocoding and language headers
export const COUNTRY_CONFIG: Record<string, { code: string; lang: string; domain: string }> = {
  'Brasil': { code: 'BR', lang: 'pt-BR,pt;q=0.9', domain: 'google.com.br' },
  'Portugal': { code: 'PT', lang: 'pt-PT,pt;q=0.9', domain: 'google.pt' },
  'Espanha': { code: 'ES', lang: 'es-ES,es;q=0.9', domain: 'google.es' },
  'Estados Unidos': { code: 'US', lang: 'en-US,en;q=0.9', domain: 'google.com' },
  'Reino Unido': { code: 'GB', lang: 'en-GB,en;q=0.9', domain: 'google.co.uk' },
  'França': { code: 'FR', lang: 'fr-FR,fr;q=0.9', domain: 'google.fr' },
  'Itália': { code: 'IT', lang: 'it-IT,it;q=0.9', domain: 'google.it' },
  'Alemanha': { code: 'DE', lang: 'de-DE,de;q=0.9', domain: 'google.de' }
};

// Blacklist of public / non-commercial institutions that shouldn't appear unless explicitly searched
const NEGATIVE_KEYWORDS = [
  'posto de saúde', 'unidade de saúde', 'posto de saude', 'unidade básica', 'ubs',
  'posto de combustível', 'posto de gasolina', 'posto ipiranga', 'posto shell', 'posto br',
  'hospital público', 'hospital municipal', 'hospital regional', 'upa 24h', 'upa',
  'delegacia', 'polícia', 'prefeitura', 'câmara municipal', 'tribunal', 'fórum',
  'escola estadual', 'escola municipal', 'colégio militar', 'creche municipal',
  'banco do brasil', 'caixa econômica', 'santander', 'bradesco agência', 'itaú agência',
  'igreja', 'paróquia', 'templo', 'cemitério'
];

export class ScraperService {
  /**
   * Search prospects using multi-source engine with STRICT niche filtering and phone extraction
   */
  public static async searchProspects(
    params: ScrapeParams,
    onProgress?: (msg: string, current: number, total: number, lead?: any) => void
  ): Promise<any[]> {
    const { niche, city, country, limit = 20, onlyWithoutWebsite = false, requirePhone = true } = params;
    const countryInfo = COUNTRY_CONFIG[country] || { code: 'BR', lang: 'pt-BR,pt;q=0.9', domain: 'google.com' };
    const query = `${niche} em ${city}, ${country}`;

    if (onProgress) onProgress(`Iniciando varredura qualificada para "${query}"...`, 0, limit);

    const rawLeads: RawProspect[] = [];
    const seenNames = new Set<string>();

    const isNegativeMatch = (name: string): boolean => {
      const lower = name.toLowerCase();
      // If user explicitly searched for postos or hospitais, allow it
      const userNicheLower = niche.toLowerCase();
      if (userNicheLower.includes('posto') || userNicheLower.includes('hospital')) return false;
      return NEGATIVE_KEYWORDS.some(neg => lower.includes(neg));
    };

    // 1. Google Maps Puppeteer Web Engine (High precision, exact niche search on Maps)
    try {
      if (onProgress) onProgress(`Escanando fichas do Google Maps em ${city}...`, 2, limit);
      const browserResults = await this.scrapeWithPuppeteer(niche, city, country, limit * 2);
      for (const item of browserResults) {
        const key = item.name.toLowerCase().trim();
        if (!seenNames.has(key) && !isNegativeMatch(item.name)) {
          seenNames.add(key);
          rawLeads.push(item);
        }
      }
    } catch (err: any) {
      console.warn('Puppeteer search notice:', err.message);
    }

    // 2. Query OpenStreetMap with STRICT specific tags (never mixes restaurants with clinics/postos)
    try {
      if (rawLeads.length < limit) {
        if (onProgress) onProgress(`Consultando diretório comercial estrito para ${niche}...`, Math.min(rawLeads.length, limit), limit);
        const osmResults = await this.scrapeOverpassOSM(niche, city, country);
        for (const item of osmResults) {
          const key = item.name.toLowerCase().trim();
          if (!seenNames.has(key) && !isNegativeMatch(item.name)) {
            seenNames.add(key);
            rawLeads.push(item);
          }
        }
      }
    } catch (err: any) {
      console.warn('Erro ao consultar OpenStreetMap Directory:', err.message);
    }

    // 3. Fallback Google Search local results
    if (rawLeads.length < limit) {
      try {
        if (onProgress) onProgress(`Pesquisando fontes públicas adicionais do Google...`, Math.min(rawLeads.length, limit), limit);
        const googleResults = await this.scrapeGoogleSearch(niche, city, country, countryInfo);
        for (const item of googleResults) {
          const key = item.name.toLowerCase().trim();
          if (!seenNames.has(key) && !isNegativeMatch(item.name)) {
            seenNames.add(key);
            rawLeads.push(item);
          }
        }
      } catch (err: any) {
        console.warn('Erro ao consultar fonte Google Search:', err.message);
      }
    }

    if (onProgress) onProgress(`Filtrando ${rawLeads.length} empresas encontradas e auditando presença web...`, rawLeads.length, limit);

    // Audit each lead and apply contact prioritization
    const processedLeads: any[] = [];
    const leadsWithPhone: any[] = [];
    const leadsWithoutPhone: any[] = [];

    const upsertLead = db.prepare(`
      INSERT INTO leads (
        id, name, category, address, city, state, country, phone, formatted_phone,
        website, has_website, website_status, website_status_code, rating, review_count,
        maps_url, lead_score, opportunity_tags, status, notes, updated_at
      ) VALUES (
        @id, @name, @category, @address, @city, @state, @country, @phone, @formatted_phone,
        @website, @has_website, @website_status, @website_status_code, @rating, @review_count,
        @maps_url, @lead_score, @opportunity_tags, @status, @notes, CURRENT_TIMESTAMP
      )
      ON CONFLICT(id) DO UPDATE SET
        category=excluded.category,
        address=excluded.address,
        phone=COALESCE(excluded.phone, leads.phone),
        formatted_phone=COALESCE(excluded.formatted_phone, leads.formatted_phone),
        website=COALESCE(excluded.website, leads.website),
        has_website=excluded.has_website,
        website_status=excluded.website_status,
        website_status_code=excluded.website_status_code,
        lead_score=excluded.lead_score,
        opportunity_tags=excluded.opportunity_tags,
        updated_at=CURRENT_TIMESTAMP
    `);

    for (const raw of rawLeads) {
      const { displayPhone, cleanPhone } = formatPhoneNumber(raw.phone, country);
      const audit = await auditWebsite(raw.website);

      if (onlyWithoutWebsite && audit.hasWebsite && audit.status === 'online') {
        continue; // Skip if user requested only leads without website
      }

      const leadRecord = {
        id: raw.id,
        name: raw.name,
        category: raw.category || niche,
        address: raw.address || `${city}, ${country}`,
        city: city,
        state: raw.state || '',
        country: country,
        phone: displayPhone,
        formatted_phone: cleanPhone,
        website: audit.hasWebsite ? raw.website : '',
        has_website: audit.hasWebsite ? 1 : 0,
        website_status: audit.status,
        website_status_code: audit.statusCode || null,
        rating: raw.rating || 0,
        review_count: raw.reviewCount || 0,
        maps_url: raw.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${raw.name} ${city}`)}`,
        lead_score: audit.leadScore,
        opportunity_tags: JSON.stringify(audit.opportunityTags),
        status: 'novo',
        notes: audit.reasonExplanation
      };

      try {
        upsertLead.run(leadRecord);
      } catch (err: any) {
        console.error('Erro ao salvar lead no banco:', err.message);
      }

      const leadWithParsedTags = {
        ...leadRecord,
        opportunity_tags: audit.opportunityTags
      };

      if (cleanPhone && cleanPhone.length >= 8) {
        leadsWithPhone.push(leadWithParsedTags);
      } else {
        leadsWithoutPhone.push(leadWithParsedTags);
      }
    }

    // If requirePhone is true, use leads with phone first; if not enough, fill with other leads
    if (requirePhone) {
      processedLeads.push(...leadsWithPhone.slice(0, limit));
      if (processedLeads.length < limit && leadsWithoutPhone.length > 0) {
        processedLeads.push(...leadsWithoutPhone.slice(0, limit - processedLeads.length));
      }
    } else {
      processedLeads.push(...[...leadsWithPhone, ...leadsWithoutPhone].slice(0, limit));
    }

    // Record search history
    try {
      db.prepare(`
        INSERT INTO searches (id, niche, city, country, total_found)
        VALUES (?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), niche, city, country, processedLeads.length);
    } catch {}

    return processedLeads;
  }

  /**
   * Browser automation scraper with deep phone & contact details extraction from Google Maps
   */
  private static async scrapeWithPuppeteer(
    niche: string,
    city: string,
    country: string,
    needed: number
  ): Promise<RawProspect[]> {
    let puppeteerModule: any;
    try {
      puppeteerModule = await import('puppeteer');
    } catch {
      return [];
    }

    let browser: any;
    try {
      browser = await puppeteerModule.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--lang=pt-BR,pt'
        ]
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1280, height: 900 });

      const searchQuery = encodeURIComponent(`${niche} em ${city} ${country}`);
      await page.goto(`https://www.google.com/maps/search/${searchQuery}`, {
        waitUntil: 'networkidle2',
        timeout: 25000
      });

      // Wait for feed items
      await page.waitForSelector('.Nv2PK, [role="feed"]', { timeout: 8000 }).catch(() => null);

      // Scroll inside feed to load more cards
      await page.evaluate(async () => {
        const feed = document.querySelector('[role="feed"], .m6QErb[aria-label]');
        if (feed) {
          for (let i = 0; i < 6; i++) {
            feed.scrollTop += 900;
            await new Promise(r => setTimeout(r, 600));
          }
        }
      });

      // Extract top cards and click only if phone is not already in card
      const cardHandles = await page.$$('.Nv2PK');
      const maxCards = Math.min(cardHandles.length, 15);
      const results: RawProspect[] = [];

      for (let i = 0; i < maxCards; i++) {
        try {
          const card = cardHandles[i];
          const name = await card.$eval('.qBF1Pd, .fontHeadlineSmall', el => el.textContent?.trim() || '').catch(() => '');
          if (!name || name.length < 2) continue;

          const category = await card.$eval('.W4Efsd span', el => el.textContent?.trim() || '').catch(() => niche);
          const mapsUrl = await card.$eval('a.hfpxzc', (el: any) => el.href || '').catch(() => '');

          // Check if phone or website is directly on card
          const cardText = await card.evaluate((el: any) => el.textContent || '');
          const phoneRegex = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,3}\)?[\s-]?)?\d{4,5}[\s-]?\d{4}/;
          const match = cardText.match(phoneRegex);
          let finalPhone = match ? match[0].trim() : '';

          let website = '';
          const directWeb = await card.$eval('a[data-value="Website"], a[href^="http"]:not([href*="google.com"])', (el: any) => el.href || '').catch(() => '');
          if (directWeb) website = directWeb;

          // If no phone found on card summary, click card with quick timeout
          if (!finalPhone) {
            await card.click().catch(() => null);
            await new Promise(r => setTimeout(r, 400));

            const details = await page.evaluate(() => {
              let phone = '';
              const phoneBtn = document.querySelector('button[data-item-id^="phone:tel:"], button[data-tooltip*="telefone" i], button[aria-label*="Telefone" i]');
              if (phoneBtn) {
                const telAttr = phoneBtn.getAttribute('data-item-id');
                if (telAttr && telAttr.startsWith('phone:tel:')) {
                  phone = telAttr.replace('phone:tel:', '').trim();
                } else {
                  phone = phoneBtn.textContent?.trim() || phoneBtn.getAttribute('aria-label')?.replace(/[^0-9+\s()-]/g, '')?.trim() || '';
                }
              }

              let site = '';
              const webBtn = document.querySelector('a[data-item-id="authority"], a[aria-label*="Website" i], a[aria-label*="Site" i]');
              if (webBtn) site = (webBtn as HTMLAnchorElement).href || '';

              return { phone, site };
            }).catch(() => ({ phone: '', site: '' }));

            if (details.phone) finalPhone = details.phone;
            if (details.site && !website) website = details.site;
          }

          const id = 'lead-' + crypto.createHash('md5').update(`${name}-${city}-${country}`).digest('hex').substring(0, 12);
          results.push({
            id,
            name,
            category: category || niche,
            address: `${city}, ${country}`,
            city,
            country,
            phone: finalPhone,
            website,
            mapsUrl: mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${city}`)}`,
            source: 'Google Maps Web Engine'
          });
        } catch (cardErr) {
          continue;
        }
      }

      await browser.close();
      return results;
    } catch (e: any) {
      if (browser) await browser.close().catch(() => null);
      return [];
    }
  }

  /**
   * Scrape OpenStreetMap with STRICT specific tags mapped to user niche
   */
  private static async scrapeOverpassOSM(niche: string, city: string, country: string): Promise<RawProspect[]> {
    const nicheLower = niche.toLowerCase();
    
    // Strict tag mappings: Never mix restaurants with clinics/postos!
    let overpassFilter = '';
    if (
      nicheLower.includes('restaurante') || 
      nicheLower.includes('bar') || 
      nicheLower.includes('pizza') || 
      nicheLower.includes('hamburguer') || 
      nicheLower.includes('cafe') || 
      nicheLower.includes('cafeteria') || 
      nicheLower.includes('bistr') ||
      nicheLower.includes('comida')
    ) {
      overpassFilter = 'node["amenity"~"^(restaurant|fast_food|cafe|bar|pub|bistro|ice_cream)$"]';
    } else if (nicheLower.includes('dentista') || nicheLower.includes('odonto')) {
      overpassFilter = 'node["amenity"="dentist"]';
    } else if (nicheLower.includes('clinica') || nicheLower.includes('medico') || nicheLower.includes('saude')) {
      overpassFilter = 'node["amenity"="clinic"]';
    } else if (nicheLower.includes('oficina') || nicheLower.includes('mecanica') || nicheLower.includes('auto')) {
      overpassFilter = 'node["shop"="car_repair"]';
    } else if (nicheLower.includes('salao') || nicheLower.includes('estetica') || nicheLower.includes('barbearia') || nicheLower.includes('cabelo')) {
      overpassFilter = 'node["shop"~"^(hairdresser|beauty)$"]';
    } else if (nicheLower.includes('advocacia') || nicheLower.includes('advogado')) {
      overpassFilter = 'node["office"="lawyer"]';
    } else if (nicheLower.includes('contabilidade') || nicheLower.includes('contador')) {
      overpassFilter = 'node["office"="accountant"]';
    } else if (nicheLower.includes('imobiliaria') || nicheLower.includes('imovel')) {
      overpassFilter = 'node["office"="estate_agent"]';
    } else if (nicheLower.includes('academia') || nicheLower.includes('crossfit') || nicheLower.includes('fitness')) {
      overpassFilter = 'node["leisure"="fitness_centre"]';
    } else if (nicheLower.includes('pet') || nicheLower.includes('veterinaria')) {
      overpassFilter = 'node["shop"="pet"]';
    } else if (nicheLower.includes('marcenaria') || nicheLower.includes('moveis')) {
      overpassFilter = 'node["shop"="furniture"]';
    } else if (nicheLower.includes('roupa') || nicheLower.includes('calcado') || nicheLower.includes('loja')) {
      overpassFilter = 'node["shop"~"^(clothes|shoes|boutique)$"]';
    } else {
      // Default: strict commercial shop/amenity
      overpassFilter = `node["name"~"${niche}", i]`;
    }

    // 1. Get City Bounding Box via Nominatim
    let bbox: string | null = null;
    try {
      const geoResp = await axios.get(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'B2BLeadHunterPro/1.0' },
        timeout: 5000
      });
      if (geoResp.data && geoResp.data.length > 0) {
        const [south, north, west, east] = geoResp.data[0].boundingbox;
        bbox = `${south},${west},${north},${east}`;
      }
    } catch {}

    if (!bbox) {
      return [];
    }

    const overpassQuery = `
      [out:json][timeout:10];
      (
        ${overpassFilter}(${bbox});
      );
      out body 35;
    `;

    const resp = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(overpassQuery)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'B2BLeadProspector/1.0'
      },
      timeout: 10000
    });

    const results: RawProspect[] = [];
    const elements = resp.data?.elements || [];

    for (const el of elements) {
      const tags = el.tags || {};
      const name = tags.name || tags['name:pt'] || tags['name:en'] || tags.operator || tags.brand;
      if (!name || name.length < 2) continue;

      const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || tags.mobile || tags['phone:mobile'];
      const website = tags.website || tags['contact:website'] || tags.url;
      const street = tags['addr:street'] ? `${tags['addr:street']} ${tags['addr:housenumber'] || ''}` : '';
      const address = street ? `${street}, ${city}` : `${city}, ${country}`;
      const category = tags.amenity || tags.shop || tags.office || tags.craft || niche;

      const id = 'lead-' + crypto.createHash('md5').update(`${name}-${city}-${country}`).digest('hex').substring(0, 12);

      results.push({
        id,
        name,
        category: category.charAt(0).toUpperCase() + category.slice(1),
        address,
        city,
        country,
        phone,
        website,
        source: 'OpenStreetMap Regional Directory',
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${city}`)}`
      });
    }

    return results;
  }

  /**
   * Scrape Google Places & Web Search results
   */
  private static async scrapeGoogleSearch(
    niche: string,
    city: string,
    country: string,
    countryInfo: { code: string; lang: string; domain: string }
  ): Promise<RawProspect[]> {
    const query = `${encodeURIComponent(niche)}+${encodeURIComponent(city)}+${encodeURIComponent(country)}`;
    const url = `https://${countryInfo.domain}/search?q=${query}&hl=${countryInfo.code.toLowerCase()}&gl=${countryInfo.code.toLowerCase()}&num=25`;

    const resp = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': countryInfo.lang,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      },
      timeout: 10000
    });

    const $ = cheerio.load(resp.data);
    const results: RawProspect[] = [];

    // Extract Local Pack / Map results from Google SERP
    $('[data-local-attribute], .VkpGBb, .uEierd, .g').each((_, el) => {
      const titleEl = $(el).find('h3, .dbg0pd, .BNeawe.vvjwJb, .OSrXXb').first();
      const title = titleEl.text().trim();

      if (!title || title.length < 3 || title.includes('Google') || title.includes('Pesquisa')) return;

      // Extract phone pattern
      const fullText = $(el).text();
      const phoneMatch = fullText.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{4,5}[-.\s]?\d{4}/);
      const phone = phoneMatch ? phoneMatch[0].trim() : undefined;

      // Extract website link
      let website: string | undefined;
      const linkEl = $(el).find('a[href^="http"]').first();
      const rawHref = linkEl.attr('href');
      if (rawHref && !rawHref.includes('google.com') && !rawHref.includes('gstatic.com') && !rawHref.includes('maps.google')) {
        try {
          const parsed = new URL(rawHref);
          if (!parsed.hostname.includes('google')) {
            website = parsed.origin;
          }
        } catch {}
      }

      // Extract rating if present
      let rating = 0;
      let reviewCount = 0;
      const ratingMatch = fullText.match(/([1-5][,\.][0-9])\s*(?:★|estrelas|\()/i);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1].replace(',', '.'));
      }
      const reviewMatch = fullText.match(/\(([0-9]+)\)/);
      if (reviewMatch) {
        reviewCount = parseInt(reviewMatch[1], 10);
      }

      const id = 'lead-' + crypto.createHash('md5').update(`${title}-${city}-${country}`).digest('hex').substring(0, 12);

      results.push({
        id,
        name: title,
        category: niche,
        address: `${city}, ${country}`,
        city,
        country,
        phone,
        website,
        rating,
        reviewCount,
        source: 'Google Search & Local Places',
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${title} ${city}`)}`
      });
    });

    return results;
  }
}
