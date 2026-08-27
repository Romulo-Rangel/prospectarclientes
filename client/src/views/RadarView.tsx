import React, { useState } from 'react';
import { 
  Search, MapPin, Globe, Loader2, Sparkles, SlidersHorizontal, 
  Flame, CheckCircle2, ChevronRight, MessageSquare, ArrowRight, ShieldCheck, Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext.js';
import { StatsCards } from '../components/StatsCards.js';
import { SearchParams } from '../types.js';

const COUNTRIES = [
  { name: 'Brasil', flag: '🇧🇷', defaultCity: 'São Paulo', cities: ['São Paulo', 'Rio de Janeiro', 'Curitiba', 'Belo Horizonte', 'Campinas', 'Porto Alegre', 'Salvador'] },
  { name: 'Portugal', flag: '🇵🇹', defaultCity: 'Lisboa', cities: ['Lisboa', 'Porto', 'Braga', 'Coimbra', 'Faro', 'Setúbal', 'Cascais', 'Aveiro'] },
  { name: 'Espanha', flag: '🇪🇸', defaultCity: 'Madrid', cities: ['Madrid', 'Barcelona', 'Valência', 'Sevilha'] },
  { name: 'Estados Unidos', flag: '🇺🇸', defaultCity: 'Miami', cities: ['Miami', 'Orlando', 'New York', 'Los Angeles'] }
];

const SECTOR_CATEGORIES = [
  {
    category: 'Alimentação & Lazer',
    items: ['Restaurantes', 'Bares & Pubs', 'Pizzarias', 'Cafeterias', 'Hamburguerias']
  },
  {
    category: 'Saúde & Estética',
    items: ['Clínicas Odontológicas', 'Clínicas Médicas', 'Salões de Beleza', 'Barbearias', 'Academias']
  },
  {
    category: 'Serviços Especializados',
    items: ['Oficinas Mecânicas', 'Contabilidade', 'Escritórios de Advocacia', 'Imobiliárias', 'Pet Shops']
  },
  {
    category: 'Comércio & Reformas',
    items: ['Marcenarias', 'Móveis Planejados', 'Lojas de Roupas', 'Materiais de Construção', 'Óticas']
  }
];

export const RadarView: React.FC = () => {
  const { 
    runSearch, 
    isSearching, 
    searchProgress, 
    leads, 
    stats, 
    setSelectedLead, 
    setActiveView,
    setIsAutoSenderOpen 
  } = useApp();

  const [country, setCountry] = useState('Brasil');
  const [city, setCity] = useState('São Paulo');
  const [niche, setNiche] = useState('Restaurantes');
  const [limit, setLimit] = useState(25);
  const [onlyWithoutWebsite, setOnlyWithoutWebsite] = useState(true);
  const [requirePhone, setRequirePhone] = useState(true);
  const [autoDispatch, setAutoDispatch] = useState(false);

  const handleCountryChange = (c: typeof COUNTRIES[0]) => {
    setCountry(c.name);
    setCity(c.defaultCity);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !niche.trim() || isSearching) return;
    await runSearch({
      country,
      city: city.trim(),
      niche: niche.trim(),
      limit,
      onlyWithoutWebsite,
      requirePhone,
      autoDispatch
    });
  };

  const progressPercent = searchProgress && searchProgress.total > 0
    ? Math.min(Math.round((searchProgress.current / searchProgress.total) * 100), 100)
    : 0;

  const currentCountry = COUNTRIES.find(c => c.name === country) || COUNTRIES[0];

  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <StatsCards stats={stats} onFilterClick={() => setActiveView('leads')} />

      {/* Main Search Radar Card */}
      <div className="glass-panel p-6 border-indigo-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              Radar de Busca & Varredura B2B
            </h3>
            <p className="text-xs text-slate-400">
              Mapeie negócios locais e internacionais no Google Maps e identifique quem precisa de website
            </p>
          </div>

          {/* Country Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
            {COUNTRIES.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleCountryChange(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  country === c.name
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{c.flag}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSearchSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Niche Input */}
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-400" />
                Nicho / Segmento de Atuação
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="ex: Restaurantes, Dentistas, Oficinas..."
                className="glass-input w-full text-xs font-medium"
                required
              />
            </div>

            {/* City Input */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                Cidade / Região
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="ex: São Paulo, Lisboa, Porto..."
                className="glass-input w-full text-xs font-medium"
                required
              />
            </div>

            {/* Submit Action */}
            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={isSearching}
                className="w-full h-[40px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-500/40 active:scale-[0.98]"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Escaneando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Iniciar Varredura</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Cities & Niches */}
          <div className="space-y-3 pt-2">
            {/* Quick City suggestions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Cidades populares em {country}:</span>
              {currentCountry.cities.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => setCity(ct)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                    city === ct
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {ct}
                </button>
              ))}
            </div>

            {/* Sector Categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {SECTOR_CATEGORIES.map((sec) => (
                <div key={sec.category} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {sec.category}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sec.items.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setNiche(item)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          niche === item
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Options Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requirePhone}
                  onChange={(e) => setRequirePhone(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Exigir Telefone / WhatsApp (Descartar sem contato)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyWithoutWebsite}
                  onChange={(e) => setOnlyWithoutWebsite(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs text-slate-200 font-semibold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  Apenas empresas SEM site
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoDispatch}
                  onChange={(e) => setAutoDispatch(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs text-indigo-300 font-bold flex items-center gap-1.5 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-500/40">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  ⚡ Disparar Mensagens Automaticamente no WhatsApp Conectado
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Quantidade de leads:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="glass-input text-xs py-1 px-2 font-semibold"
              >
                <option value={15}>15 leads</option>
                <option value={25}>25 leads</option>
                <option value={50}>50 leads</option>
              </select>
            </div>
          </div>
        </form>

        {/* Live Scan Monitor */}
        {isSearching && searchProgress && (
          <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-indigo-500/40 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-indigo-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                {searchProgress.message}
              </span>
              <span className="text-slate-400">
                {searchProgress.current} / {searchProgress.total || limit}
              </span>
            </div>

            {/* Scanning Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden scanning-bar">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {searchProgress.latestLead && (
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                <div className="truncate">
                  <span className="text-slate-500 font-medium">Lead detectado: </span>
                  <strong className="text-white">{searchProgress.latestLead.name}</strong>
                  <span className="text-slate-400 ml-1.5">({searchProgress.latestLead.category})</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  searchProgress.latestLead.lead_score === 'Alta' ? 'badge-high' : 'badge-med'
                }`}>
                  Score: {searchProgress.latestLead.lead_score}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick View of Discovered Leads */}
      {leads.length > 0 && (
        <div className="glass-panel p-5 border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Últimas Oportunidades Encontradas ({leads.length})
            </h3>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAutoSenderOpen(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Disparo Automático WhatsApp 🚀</span>
              </button>

              <button
                onClick={() => setActiveView('leads')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pl-2 border-l border-slate-800"
              >
                Ver tabela &rarr;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {leads.slice(0, 6).map((lead) => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 glass-panel-hover cursor-pointer space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-white line-clamp-1">{lead.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                      lead.lead_score === 'Alta' ? 'badge-high' : 'badge-med'
                    }`}>
                      {lead.lead_score}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{lead.category} • {lead.city}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                  <span className={`font-semibold ${lead.has_website ? 'text-slate-400' : 'text-amber-400'}`}>
                    {lead.has_website ? 'Com Site' : '🚫 Sem Website'}
                  </span>
                  <span className="text-indigo-400 font-bold flex items-center gap-0.5">
                    Abordar <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
