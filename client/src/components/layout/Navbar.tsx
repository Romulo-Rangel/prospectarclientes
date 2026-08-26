import React from 'react';
import { Download, User, Sparkles, Globe2, ShieldCheck, Menu, Bot } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';

const VIEW_TITLES: Record<string, { title: string; subtitle: string }> = {
  radar: { title: 'Radar de Prospecção', subtitle: 'Varredura de empresas no Google Maps' },
  autopilot: { title: 'Robô Caçador Diário', subtitle: 'Prospecção autônoma nos EUA e Europa' },
  kanban: { title: 'Pipeline Visual (CRM)', subtitle: 'Jornada de cada oportunidade' },
  leads: { title: 'Base Geral de Leads', subtitle: 'Lista completa com filtros e auditoria' },
  templates: { title: 'Central de Mensagens', subtitle: 'Modelos adaptados por país e idioma' },
  analytics: { title: 'Métricas & Relatórios', subtitle: 'Visão consolidada de conversão' },
  settings: { title: 'Configurações', subtitle: 'Perfil do remetente e preferências' }
};

export const Navbar: React.FC = () => {
  const { activeView, senderName, agencyName, setIsMobileMenuOpen } = useApp();
  const info = VIEW_TITLES[activeView] || VIEW_TITLES.radar;

  return (
    <header className="h-16 px-4 md:px-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          title="Abrir menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            {info.title}
          </h2>
          <p className="text-[10px] md:text-[11px] text-slate-400 line-clamp-1">{info.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Export CSV */}
        <a
          href={api.getExportCsvUrl()}
          download="prospects_leads.csv"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 rounded-xl text-xs font-semibold transition-colors"
          title="Exportar base completa para Excel / CSV"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </a>

        {/* User Badge */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/20">
            {senderName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-white leading-tight">{senderName}</div>
            <div className="text-[10px] text-slate-400">{agencyName}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
