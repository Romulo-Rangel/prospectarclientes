import React, { useState, useEffect } from 'react';
import { Search, MapPin, Globe, Filter, Loader2, Sparkles, SlidersHorizontal, CheckCircle } from 'lucide-react';
import { SearchParams } from '../types.js';

interface SearchPanelProps {
  onSearch: (params: SearchParams) => Promise<void>;
  isSearching: boolean;
  searchProgress: { message: string; current: number; total: number; latestLead?: any } | null;
}

const COUNTRIES = [
  { name: 'Brasil', flag: '🇧🇷', cities: ['São Paulo', 'Rio de Janeiro', 'Curitiba', 'Belo Horizonte', 'Campinas', 'Porto Alegre', 'Salvador', 'Fortaleza'] },
  { name: 'Portugal', flag: '🇵🇹', cities: ['Lisboa', 'Porto', 'Braga', 'Coimbra', 'Faro', 'Setúbal', 'Cascais', 'Aveiro'] },
  { name: 'Espanha', flag: '🇪🇸', cities: ['Madrid', 'Barcelona', 'Valência', 'Sevilha'] },
  { name: 'Estados Unidos', flag: '🇺🇸', cities: ['Miami', 'Orlando', 'New York', 'Los Angeles'] }
];

const POPULAR_NICHES = [
  'Restaurantes & Bares',
  'Clínicas Odontológicas',
  'Oficinas Mecânicas',
  'Contabilidade & Advocacia',
  'Imobiliárias & Corretores',
  'Salões de Beleza & Estética',
  'Academias & Crossfit',
  'Pet Shops & Veterinárias',
  'Marcenarias & Móveis Planejados',
  'Lojas de Roupas & Calçados'
];

export const SearchPanel: React.FC<SearchPanelProps> = ({
  onSearch,
  isSearching,
  searchProgress
}) => {
  const [country, setCountry] = useState('Brasil');
  const [city, setCity] = useState('São Paulo');
  const [niche, setNiche] = useState('Clínicas Odontológicas');
  const [limit, setLimit] = useState(25);
  const [onlyWithoutWebsite, setOnlyWithoutWebsite] = useState(false);

  const currentCountryConfig = COUNTRIES.find(c => c.name === country) || COUNTRIES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !niche.trim() || isSearching) return;
    await onSearch({
      country,
      city: city.trim(),
      niche: niche.trim(),
      limit,
      onlyWithoutWebsite
    });
  };

  const progressPercent = searchProgress && searchProgress.total > 0
    ? Math.min(Math.round((searchProgress.current / searchProgress.total) * 100), 100)
    : 0;

  return (
    <div className="glass-panel p-6 border-indigo-500/20 shadow-xl relative overflow-hidden">
      {/* Background radial accent */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Radar de Oportunidades Google Maps
          </h2>
          <p className="text-xs text-slate-400">
            Encontre empresas na sua região ou no exterior que precisam de sites e sistemas web
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400">País alvo:</span>
          <div className="flex gap-1.5">
            {COUNTRIES.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  setCountry(c.name);
                  if (c.cities[0]) setCity(c.cities[0]);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  country === c.name
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{c.flag}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Niche Input */}
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              Nicho ou Segmento
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="ex: Restaurantes, Dentistas, Contabilidade..."
              className="glass-input w-full text-xs"
              required
            />
          </div>

          {/* City Input */}
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              Cidade / Região
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="ex: São Paulo, Lisboa, Porto..."
              className="glass-input w-full text-xs"
              required
            />
          </div>

          {/* Limit and Submit */}
          <div className="md:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full h-[38px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-500/40 active:scale-[0.98]"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
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

        {/* Suggestion tags & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Quick Niche Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-medium">Nichos em alta:</span>
            {POPULAR_NICHES.slice(0, 5).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setNiche(item)}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900/80 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-300 transition-colors"
              >
                {item}
              </button>
            ))}
          </div>

          {/* Search Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyWithoutWebsite}
                onChange={(e) => setOnlyWithoutWebsite(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                <Globe className="w-3 h-3 text-amber-400" />
                Apenas sem website
              </span>
            </label>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <SlidersHorizontal className="w-3 h-3" />
              <span>Limite:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-md px-1.5 py-0.5 outline-none"
              >
                <option value={15}>15 leads</option>
                <option value={25}>25 leads</option>
                <option value={50}>50 leads</option>
              </select>
            </div>
          </div>
        </div>
      </form>

      {/* Progress & Live Feed */}
      {isSearching && searchProgress && (
        <div className="mt-5 p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-indigo-300 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              {searchProgress.message}
            </span>
            <span className="text-slate-400">
              {searchProgress.current} / {searchProgress.total || limit}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden scanning-bar">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {searchProgress.latestLead && (
            <div className="mt-3 text-[11px] text-slate-300 flex items-center justify-between border-t border-slate-800/80 pt-2">
              <span className="truncate">
                Último auditado: <strong className="text-white">{searchProgress.latestLead.name}</strong> ({searchProgress.latestLead.category})
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                searchProgress.latestLead.lead_score === 'Alta'
                  ? 'badge-high'
                  : searchProgress.latestLead.lead_score === 'Média'
                  ? 'badge-med'
                  : 'badge-low'
              }`}>
                Score: {searchProgress.latestLead.lead_score}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
