import React from 'react';
import { useApp } from '../context/AppContext.js';
import { BarChart3, TrendingUp, Globe2, Flame, Users, CheckCircle2, ShieldCheck } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { stats, leads } = useApp();

  if (!stats) return null;

  const funnelSteps = [
    { label: 'Leads Mapeados', count: stats.totalLeads, color: 'bg-indigo-500', percent: 100 },
    { label: 'Mensagens Enviadas', count: stats.contacted + stats.negotiating + stats.converted, color: 'bg-blue-500', percent: stats.totalLeads > 0 ? Math.round(((stats.contacted + stats.negotiating + stats.converted) / stats.totalLeads) * 100) : 0 },
    { label: 'Em Negociação', count: stats.negotiating + stats.converted, color: 'bg-amber-500', percent: stats.totalLeads > 0 ? Math.round(((stats.negotiating + stats.converted) / stats.totalLeads) * 100) : 0 },
    { label: 'Clientes Fechados', count: stats.converted, color: 'bg-emerald-500', percent: stats.totalLeads > 0 ? Math.round((stats.converted / stats.totalLeads) * 100) : 0 }
  ];

  const highScoreCount = leads.filter(l => l.lead_score === 'Alta').length;
  const medScoreCount = leads.filter(l => l.lead_score === 'Média').length;
  const lowScoreCount = leads.filter(l => l.lead_score === 'Baixa').length;

  return (
    <div className="space-y-6">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 border-slate-800 space-y-1">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Taxa de Conversão de Fechamentos
          </div>
          <div className="text-3xl font-extrabold text-white">
            {stats.totalLeads > 0 ? `${((stats.converted / stats.totalLeads) * 100).toFixed(1)}%` : '0.0%'}
          </div>
          <div className="text-[11px] text-slate-500">{stats.converted} clientes convertidos de {stats.totalLeads} prospectados</div>
        </div>

        <div className="glass-panel p-5 border-slate-800 space-y-1">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-400" />
            Leads de Altíssima Prioridade
          </div>
          <div className="text-3xl font-extrabold text-rose-400">
            {stats.highOpportunity}
          </div>
          <div className="text-[11px] text-slate-500">Sem site ou com site fora do ar</div>
        </div>

        <div className="glass-panel p-5 border-slate-800 space-y-1">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Globe2 className="w-4 h-4 text-indigo-400" />
            Países Mapeados
          </div>
          <div className="text-3xl font-extrabold text-white">
            {stats.countries?.length || 1}
          </div>
          <div className="text-[11px] text-slate-500">Brasil, Portugal e mercados internacionais</div>
        </div>
      </div>

      {/* Funnel & Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Conversion Funnel */}
        <div className="glass-panel p-6 border-slate-800 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Funil de Conversão de Prospecção
          </h3>

          <div className="space-y-4">
            {funnelSteps.map((step, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">{step.label}</span>
                  <span className="text-slate-400">{step.count} ({step.percent}%)</span>
                </div>
                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full ${step.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(step.percent, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Opportunity Score Breakdown */}
        <div className="glass-panel p-6 border-slate-800 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            Distribuição por Lead Score
          </h3>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 space-y-1">
              <div className="text-2xl font-bold text-rose-400">{highScoreCount}</div>
              <div className="text-xs font-semibold text-white">🔥 Alta</div>
              <div className="text-[10px] text-slate-400">Sem site / offline</div>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-1">
              <div className="text-2xl font-bold text-amber-400">{medScoreCount}</div>
              <div className="text-xs font-semibold text-white">Média</div>
              <div className="text-[10px] text-slate-400">Site sem SSL / lento</div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-1">
              <div className="text-2xl font-bold text-emerald-400">{lowScoreCount}</div>
              <div className="text-xs font-semibold text-white">Baixa</div>
              <div className="text-[10px] text-slate-400">Site moderno ativo</div>
            </div>
          </div>

          {/* Country Distribution Table */}
          {stats.countries && stats.countries.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400 block mb-2">Leads por País:</span>
              <div className="space-y-1.5">
                {stats.countries.map((c: any) => (
                  <div key={c.country} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-900/60">
                    <span className="font-medium text-slate-200">{c.country}</span>
                    <span className="font-bold text-indigo-400">{c.count} leads</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
