import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lead, Template, Stats, SearchParams } from '../types.js';
import { api } from '../services/api.js';
import confetti from 'canvas-confetti';

export type ActiveView = 'radar' | 'autopilot' | 'ai-agent' | 'kanban' | 'leads' | 'templates' | 'analytics' | 'settings';

interface AppContextType {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  leads: Lead[];
  stats: Stats | null;
  templates: Template[];
  selectedLead: Lead | null;
  isAutoSenderOpen: boolean;
  isMobileMenuOpen: boolean;
  senderName: string;
  senderPhone: string;
  agencyName: string;
  isSearching: boolean;
  searchProgress: { message: string; current: number; total: number; latestLead?: any } | null;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  setSenderName: (name: string) => void;
  setSenderPhone: (phone: string) => void;
  setAgencyName: (name: string) => void;
  setSelectedLead: (lead: Lead | null) => void;
  setIsAutoSenderOpen: (open: boolean) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  refreshData: () => Promise<void>;
  runSearch: (params: SearchParams) => Promise<void>;
  updateLeadStatus: (id: string, status: Lead['status']) => Promise<void>;
  updateLeadNotes: (id: string, notes: string) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  clearAllLeads: () => Promise<void>;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ActiveView>('radar');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAutoSenderOpen, setIsAutoSenderOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [senderName, setSenderNameState] = useState<string>(() => {
    return localStorage.getItem('lead_sender_name') || 'Rômulo';
  });

  const [senderPhone, setSenderPhoneState] = useState<string>(() => {
    return localStorage.getItem('lead_sender_phone') || '(27) 98817-2973';
  });

  const [agencyName, setAgencyNameState] = useState<string>(() => {
    return localStorage.getItem('lead_agency_name') || 'DevStudio Soluções Web';
  });

  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<{
    message: string;
    current: number;
    total: number;
    latestLead?: any;
  } | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const setSenderName = (name: string) => {
    setSenderNameState(name);
    localStorage.setItem('lead_sender_name', name);
  };

  const setAgencyName = (name: string) => {
    setAgencyNameState(name);
    localStorage.setItem('lead_agency_name', name);
  };

  const refreshData = async () => {
    try {
      const [leadsData, statsData, templatesData] = await Promise.all([
        api.getLeads(),
        api.getStats(),
        api.getTemplates()
      ]);
      setLeads(leadsData);
      setStats(statsData);
      setTemplates(templatesData);
    } catch (err: any) {
      console.error('Erro ao sincronizar dados:', err);
    }
  };

  useEffect(() => {
    refreshData();

    // SSE Stream
    const eventSource = new EventSource('/api/search/stream');
    eventSource.addEventListener('start', () => setIsSearching(true));
    eventSource.addEventListener('progress', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setSearchProgress({
          message: data.message,
          current: data.current,
          total: data.total,
          latestLead: data.lead
        });
      } catch {}
    });
    eventSource.addEventListener('done', () => {
      setIsSearching(false);
      setSearchProgress(null);
      refreshData();
    });
    eventSource.addEventListener('error', () => {
      setIsSearching(false);
      setSearchProgress(null);
    });

    return () => eventSource.close();
  }, []);

  const runSearch = async (params: SearchParams) => {
    try {
      setIsSearching(true);
      setSearchProgress({
        message: `Iniciando varredura para ${params.niche} em ${params.city}...`,
        current: 0,
        total: params.limit
      });

      const res = await api.runSearch(params);
      showNotification(`Busca concluída! ${res.total} potenciais clientes adicionados.`, 'success');
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });

      await refreshData();
    } catch (err: any) {
      showNotification(err.message || 'Erro durante a busca.', 'error');
    } finally {
      setIsSearching(false);
      setSearchProgress(null);
    }
  };

  const updateLeadStatus = async (id: string, status: Lead['status']) => {
    try {
      await api.updateLeadStatus(id, status);
      setLeads(prev => prev.map(l => (l.id === id ? { ...l, status } : l)));
      if (selectedLead?.id === id) {
        setSelectedLead(prev => (prev ? { ...prev, status } : null));
      }
      const newStats = await api.getStats();
      setStats(newStats);

      if (status === 'convertido') {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        showNotification('🎉 Parabéns! Lead marcado como Fechado / Convertido!', 'success');
      } else {
        showNotification(`Status atualizado para "${status}".`, 'info');
      }
    } catch (err: any) {
      showNotification('Erro ao atualizar status: ' + err.message, 'error');
    }
  };

  const updateLeadNotes = async (id: string, notes: string) => {
    try {
      await api.updateLeadNotes(id, notes);
      setLeads(prev => prev.map(l => (l.id === id ? { ...l, notes } : l)));
      if (selectedLead?.id === id) {
        setSelectedLead(prev => (prev ? { ...prev, notes } : null));
      }
      showNotification('Anotações salvas.', 'success');
    } catch (err: any) {
      showNotification('Erro ao salvar anotações: ' + err.message, 'error');
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await api.deleteLead(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      if (selectedLead?.id === id) setSelectedLead(null);
      const newStats = await api.getStats();
      setStats(newStats);
      showNotification('Lead removido da base.', 'info');
    } catch (err: any) {
      showNotification('Erro ao excluir: ' + err.message, 'error');
    }
  };

  const clearAllLeads = async () => {
    try {
      await api.clearAllLeads();
      setLeads([]);
      setSelectedLead(null);
      const newStats = await api.getStats();
      setStats(newStats);
      showNotification('Todos os leads foram removidos.', 'info');
    } catch (err: any) {
      showNotification('Erro ao limpar: ' + err.message, 'error');
    }
  };

  const setSenderPhone = (phone: string) => {
    setSenderPhoneState(phone);
    localStorage.setItem('lead_sender_phone', phone);
  };

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        leads,
        stats,
        templates,
        selectedLead,
        isAutoSenderOpen,
        isMobileMenuOpen,
        senderName,
        senderPhone,
        agencyName,
        isSearching,
        searchProgress,
        notification,
        setSenderName,
        setSenderPhone,
        setAgencyName,
        setSelectedLead,
        setIsAutoSenderOpen,
        setIsMobileMenuOpen,
        refreshData,
        runSearch,
        updateLeadStatus,
        updateLeadNotes,
        deleteLead,
        clearAllLeads,
        showNotification
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp deve ser usado dentro de AppProvider');
  return context;
};
