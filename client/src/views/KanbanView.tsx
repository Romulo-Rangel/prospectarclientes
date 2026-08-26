import React from 'react';
import { useApp } from '../context/AppContext.js';
import { Lead } from '../types.js';
import { 
  Sparkles, Phone, MessageSquare, Send, ArrowRight, ArrowLeft, 
  CheckCircle2, Globe, Flame, Plus, ExternalLink 
} from 'lucide-react';

const COLUMNS: { id: Lead['status']; title: string; color: string; badgeColor: string; icon: string }[] = [
  { id: 'novo', title: 'Novos Leads', color: 'border-slate-700 bg-slate-900/30', badgeColor: 'bg-slate-800 text-slate-300', icon: '🆕' },
  { id: 'contatado', title: 'Abordados / Mensagem', color: 'border-indigo-800/60 bg-indigo-950/20', badgeColor: 'bg-indigo-950 text-indigo-300 border border-indigo-700/50', icon: '💬' },
  { id: 'em_negociacao', title: 'Em Negociação', color: 'border-amber-800/60 bg-amber-950/20', badgeColor: 'bg-amber-950 text-amber-300 border border-amber-700/50', icon: '🤝' },
  { id: 'convertido', title: 'Clientes Fechados', color: 'border-emerald-800/60 bg-emerald-950/20', badgeColor: 'bg-emerald-950 text-emerald-300 border border-emerald-700/50', icon: '🎉' },
  { id: 'descartado', title: 'Descartados', color: 'border-red-900/40 bg-red-950/10', badgeColor: 'bg-red-950/60 text-red-400', icon: '❌' }
];

export const KanbanView: React.FC = () => {
  const { leads, updateLeadStatus, setSelectedLead, setActiveView, setIsAutoSenderOpen } = useApp();

  const getNextStatus = (current: Lead['status']): Lead['status'] | null => {
    switch (current) {
      case 'novo': return 'contatado';
      case 'contatado': return 'em_negociacao';
      case 'em_negociacao': return 'convertido';
      default: return null;
    }
  };

  const getPrevStatus = (current: Lead['status']): Lead['status'] | null => {
    switch (current) {
      case 'convertido': return 'em_negociacao';
      case 'em_negociacao': return 'contatado';
      case 'contatado': return 'novo';
      case 'descartado': return 'novo';
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white">Pipeline de Oportunidades (Kanban)</h2>
          <p className="text-xs text-slate-400">Acompanhe e movimente seus clientes em cada etapa do funil</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoSenderOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Disparo Automático WhatsApp 🚀</span>
          </button>

          <button
            onClick={() => setActiveView('radar')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Buscar Novos Leads</span>
          </button>
        </div>
      </div>

      {/* Columns Container */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto min-h-[calc(100vh-230px)] pb-6">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter(l => l.status === col.id);
          return (
            <div
              key={col.id}
              className={`rounded-2xl border ${col.color} flex flex-col p-3 space-y-3 min-w-[250px]`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span>{col.icon}</span>
                  <span className="text-xs font-bold text-white">{col.title}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badgeColor}`}>
                  {colLeads.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {colLeads.length === 0 ? (
                  <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-800/60 rounded-xl text-[11px] text-slate-600 text-center p-3">
                    Nenhum lead nesta etapa
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const next = getNextStatus(lead.status);
                    const prev = getPrevStatus(lead.status);
                    const rawCleanPhone = lead.formatted_phone || lead.phone?.replace(/\D/g, '');

                    return (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="glass-panel p-3.5 border-slate-800 hover:border-indigo-500/50 glass-panel-hover cursor-pointer space-y-2.5 group"
                      >
                        {/* Title & Score */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                            {lead.name}
                          </h4>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${
                            lead.lead_score === 'Alta' ? 'badge-high' : 'badge-med'
                          }`}>
                            {lead.lead_score}
                          </span>
                        </div>

                        {/* Niche & Location */}
                        <div className="text-[11px] text-slate-400">
                          <div>{lead.category}</div>
                          <div className="text-slate-500 text-[10px]">{lead.city} • {lead.country}</div>
                        </div>

                        {/* Status Tags */}
                        <div className="flex flex-wrap gap-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            lead.has_website ? 'bg-slate-800 text-slate-300' : 'bg-amber-950/60 border border-amber-800/50 text-amber-300'
                          }`}>
                            {lead.has_website ? 'Possui Site' : '🚫 Sem Site'}
                          </span>
                        </div>

                        {/* Card Actions Footer */}
                        <div
                          className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            {prev && (
                              <button
                                onClick={() => updateLeadStatus(lead.id, prev)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                                title="Mover para etapa anterior"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {next && (
                              <button
                                onClick={() => updateLeadStatus(lead.id, next)}
                                className="p-1 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white"
                                title="Avançar etapa"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {rawCleanPhone && (
                              <a
                                href={`https://wa.me/${rawCleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-colors"
                                title="Abrir WhatsApp"
                              >
                                <Send className="w-3 h-3" />
                              </a>
                            )}
                            <button
                              onClick={() => setSelectedLead(lead)}
                              className="text-[10px] font-semibold text-indigo-400 hover:underline"
                            >
                              Ver Detalhes
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
