import React, { useState } from 'react';
import { Lead } from '../types.js';
import { 
  Search, Filter, Globe, Phone, MessageSquare, ExternalLink, Trash2, 
  Sparkles, CheckCircle2, ChevronDown, Flame, ShieldAlert, ArrowUpDown
} from 'lucide-react';

interface LeadsTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (id: string, status: Lead['status']) => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  activeFilter?: string;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  onSelectLead,
  onUpdateStatus,
  onDeleteLead,
  onClearAll,
  activeFilter = 'todos'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [scoreFilter, setScoreFilter] = useState('todos');
  const [hasWebsiteFilter, setHasWebsiteFilter] = useState('todos');
  const [countryFilter, setCountryFilter] = useState('todos');

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    if (activeFilter === 'sem_site' && lead.has_website) return false;
    if (activeFilter === 'alta' && lead.lead_score !== 'Alta') return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = lead.name.toLowerCase().includes(term);
      const matchCat = lead.category?.toLowerCase().includes(term);
      const matchCity = lead.city?.toLowerCase().includes(term);
      const matchPhone = lead.phone?.includes(term);
      if (!matchName && !matchCat && !matchCity && !matchPhone) return false;
    }

    if (statusFilter !== 'todos' && lead.status !== statusFilter) return false;
    if (scoreFilter !== 'todos' && lead.lead_score !== scoreFilter) return false;
    if (hasWebsiteFilter === 'no_website' && lead.has_website) return false;
    if (hasWebsiteFilter === 'with_website' && !lead.has_website) return false;
    if (countryFilter !== 'todos' && lead.country !== countryFilter) return false;

    return true;
  });

  const countries = Array.from(new Set(leads.map(l => l.country).filter(Boolean)));

  return (
    <div className="glass-panel overflow-hidden border-slate-800 shadow-2xl">
      {/* Top Controls & Search Bar */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, nicho, telefone..."
            className="glass-input pl-9 pr-4 py-2 w-full text-xs"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input text-xs py-1.5 px-2.5"
          >
            <option value="todos">Status: Todos</option>
            <option value="novo">🆕 Novo</option>
            <option value="contatado">💬 Contatado</option>
            <option value="em_negociacao">🤝 Em Negociação</option>
            <option value="convertido">🎉 Convertido</option>
            <option value="descartado">❌ Descartado</option>
          </select>

          {/* Lead Score Filter */}
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="glass-input text-xs py-1.5 px-2.5"
          >
            <option value="todos">Score: Todos</option>
            <option value="Alta">🔥 Alta Oportunidade</option>
            <option value="Média">Média</option>
            <option value="Baixa">Baixa</option>
          </select>

          {/* Website Filter */}
          <select
            value={hasWebsiteFilter}
            onChange={(e) => setHasWebsiteFilter(e.target.value)}
            className="glass-input text-xs py-1.5 px-2.5"
          >
            <option value="todos">Website: Todos</option>
            <option value="no_website">🚫 Apenas Sem Site</option>
            <option value="with_website">🌐 Com Site</option>
          </select>

          {/* Country Filter */}
          {countries.length > 1 && (
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="glass-input text-xs py-1.5 px-2.5"
            >
              <option value="todos">País: Todos</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {leads.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Deseja realmente apagar todos os leads salvos?')) {
                  onClearAll();
                }
              }}
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Limpar todos os leads salvos"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="px-4 py-3.5">Empresa / Nicho</th>
              <th className="px-4 py-3.5">Localização</th>
              <th className="px-4 py-3.5">Presença Digital</th>
              <th className="px-4 py-3.5">Telefone / Contato</th>
              <th className="px-4 py-3.5 text-center">Score</th>
              <th className="px-4 py-3.5">Status CRM</th>
              <th className="px-4 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                  {leads.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <Sparkles className="w-8 h-8 text-indigo-400/50" />
                      <span>Nenhum lead prospectado ainda. Use o Radar acima para iniciar a varredura!</span>
                    </div>
                  ) : (
                    <span>Nenhum lead corresponde aos filtros selecionados.</span>
                  )}
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-900/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectLead(lead)}
                  >
                    {/* Company */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                        {lead.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{lead.category}</span>
                        {lead.rating > 0 && (
                          <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                            ★ {lead.rating.toFixed(1)} {lead.review_count > 0 && `(${lead.review_count})`}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-200">{lead.city}</div>
                      <div className="text-[11px] text-slate-500">{lead.country}</div>
                    </td>

                    {/* Digital Presence */}
                    <td className="px-4 py-3.5">
                      {lead.has_website ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">
                            <Globe className="w-3 h-3" />
                            Com Site
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-800/40">
                          <Globe className="w-3 h-3" />
                          Sem Website
                        </span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-slate-200">
                        {lead.phone || <span className="text-slate-600">Não informado</span>}
                      </div>
                    </td>

                    {/* Lead Score */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          lead.lead_score === 'Alta'
                            ? 'badge-high'
                            : lead.lead_score === 'Média'
                            ? 'badge-med'
                            : 'badge-low'
                        }`}
                      >
                        {lead.lead_score === 'Alta' ? '🔥 Alta' : lead.lead_score}
                      </span>
                    </td>

                    {/* Status CRM */}
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(e) => onUpdateStatus(lead.id, e.target.value as Lead['status'])}
                        className={`glass-input text-[11px] py-1 px-2 font-semibold ${
                          lead.status === 'convertido'
                            ? 'text-emerald-400 border-emerald-500/50'
                            : lead.status === 'contatado'
                            ? 'text-indigo-300 border-indigo-500/40'
                            : lead.status === 'em_negociacao'
                            ? 'text-amber-300 border-amber-500/40'
                            : 'text-slate-300'
                        }`}
                      >
                        <option value="novo">🆕 Novo</option>
                        <option value="contatado">💬 Contatado</option>
                        <option value="em_negociacao">🤝 Negociando</option>
                        <option value="convertido">🎉 Fechado</option>
                        <option value="descartado">❌ Descartado</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectLead(lead)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                          title="Ver abordagem pronta & WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Abordar</span>
                        </button>

                        <button
                          onClick={() => onDeleteLead(lead.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                          title="Excluir lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <span>Mostrando {filteredLeads.length} de {leads.length} leads</span>
        <span>Clique em qualquer linha para abrir os detalhes e mensagem personalizada</span>
      </div>
    </div>
  );
};
