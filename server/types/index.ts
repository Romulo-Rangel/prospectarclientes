export interface Lead {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  phone?: string;
  formatted_phone?: string;
  website?: string;
  has_website: number | boolean;
  website_status: 'online' | 'offline' | 'error' | 'no_website' | 'unknown';
  website_status_code?: number;
  rating: number;
  review_count: number;
  maps_url: string;
  lead_score: 'Alta' | 'Média' | 'Baixa';
  opportunity_tags: string[];
  status: 'novo' | 'contatado' | 'em_negociacao' | 'convertido' | 'descartado';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  name: string;
  channel: 'whatsapp' | 'email' | 'instagram' | 'call';
  target_country: string;
  subject?: string;
  content: string;
  created_at?: string;
}

export interface SearchQuery {
  niche: string;
  city: string;
  country: string;
  limit?: number;
  onlyWithoutWebsite?: boolean;
  requirePhone?: boolean;
}

export interface StatsResponse {
  totalLeads: number;
  withoutWebsite: number;
  highOpportunity: number;
  contacted: number;
  negotiating: number;
  converted: number;
  discarded: number;
  conversionRate: number;
  countries: { country: string; count: number }[];
  categories: { category: string; count: number }[];
}
