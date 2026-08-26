import React from 'react';
import { Stats } from '../types.js';
import { Flame, Globe, MessageCircle, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

interface StatsCardsProps {
  stats: Stats | null;
  onFilterClick?: (filterType: string) => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, onFilterClick }) => {
  if (!stats) return null;

  const cards = [
    {
      title: 'Total de Leads',
      value: stats.totalLeads,
      label: 'Prospectados no Radar',
      icon: Sparkles,
      color: 'from-blue-500/20 to-indigo-500/20 border-indigo-500/30 text-indigo-400',
      badge: 'Base Ativa',
      filter: 'todos'
    },
    {
      title: 'Sem Website',
      value: stats.withoutWebsite,
      label: 'Precisam de Site Urgente',
      icon: Globe,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
      badge: 'Alvo Principal',
      filter: 'sem_site'
    },
    {
      title: 'Oportunidade Alta',
      value: stats.highOpportunity,
      label: 'Lead Score 90-100%',
      icon: Flame,
      color: 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-400',
      badge: '🔥 Mais Fácil Fechar',
      filter: 'alta'
    },
    {
      title: 'Em Negociação / Fechados',
      value: `${stats.negotiating} / ${stats.converted}`,
      label: 'Pipeline & Conversões',
      icon: TrendingUp,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
      badge: `${stats.contacted} contatados`,
      filter: 'pipeline'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            onClick={() => onFilterClick && onFilterClick(card.filter)}
            className={`glass-panel p-4 bg-gradient-to-br ${card.color} glass-panel-hover cursor-pointer relative overflow-hidden group`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">{card.title}</span>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5 group-hover:scale-110 transition-transform">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white tracking-tight">{card.value}</span>
              <span className="text-[10px] font-medium text-slate-400">{card.label}</span>
            </div>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-900/80 border border-white/10 text-slate-300">
                {card.badge}
              </span>
              <span className="text-[10px] text-slate-400 group-hover:text-indigo-300 transition-colors">
                Filtrar &rarr;
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
