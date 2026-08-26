import React from 'react';
import { 
  Radar, 
  LayoutDashboard, 
  TableProperties, 
  MessageSquareCode, 
  BarChart3, 
  Settings, 
  Target, 
  Sparkles, 
  ChevronRight, 
  Flame,
  Bot,
  X
} from 'lucide-react';
import { useApp, ActiveView } from '../../context/AppContext.js';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, stats, leads, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();

  const navItems: { id: ActiveView; label: string; icon: React.ElementType; badge?: string | number; section: string }[] = [
    { id: 'radar', label: 'Radar de Busca', icon: Radar, section: 'PROSPECÇÃO', badge: 'Live' },
    { id: 'autopilot', label: 'Robô Caçador (10/dia)', icon: Bot, section: 'PROSPECÇÃO', badge: 'EUA & Europa' },
    { id: 'kanban', label: 'Pipeline CRM', icon: LayoutDashboard, section: 'PROSPECÇÃO', badge: stats?.negotiating ? `${stats.negotiating} em neg.` : undefined },
    { id: 'leads', label: 'Base de Leads', icon: TableProperties, section: 'PROSPECÇÃO', badge: leads.length },
    { id: 'templates', label: 'Modelos de Mensagem', icon: MessageSquareCode, section: 'OUTREACH & VENDAS' },
    { id: 'analytics', label: 'Métricas & Relatórios', icon: BarChart3, section: 'OUTREACH & VENDAS' },
    { id: 'settings', label: 'Configurações', icon: Settings, section: 'SISTEMA' }
  ];

  const sections = ['PROSPECÇÃO', 'OUTREACH & VENDAS', 'SISTEMA'];

  const handleNavClick = (id: ActiveView) => {
    setActiveView(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Container (Responsive Drawer on Mobile, Fixed Sidebar on Desktop) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-72 md:w-64 flex-shrink-0 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between select-none
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div>
          <div className="p-4 md:p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25">
                <Target className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  FindLead <span className="text-indigo-400">Pro</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">B2B Web Discovery</p>
              </div>
            </div>

            {/* Close button on mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sections */}
          <div className="py-4 px-3 space-y-5 overflow-y-auto max-h-[calc(100vh-160px)]">
            {sections.map((section) => {
              const items = navItems.filter(item => item.section === section);
              return (
                <div key={section} className="space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-bold text-slate-500 tracking-wider">
                    {section}
                  </div>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-500/40'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>

                        {item.badge !== undefined && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : item.badge === 'Live'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Status Pill in Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-medium text-slate-300">Online & Pronto</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">:3001</span>
          </div>
        </div>
      </aside>
    </>
  );
};
