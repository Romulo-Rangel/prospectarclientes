import React from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { Navbar } from './components/layout/Navbar.js';
import { RadarView } from './views/RadarView.js';
import { KanbanView } from './views/KanbanView.js';
import { LeadsView } from './views/LeadsView.js';
import { TemplatesView } from './views/TemplatesView.js';
import { AnalyticsView } from './views/AnalyticsView.js';
import { SettingsView } from './views/SettingsView.js';
import { AutopilotView } from './views/AutopilotView.js';
import { AIAgentView } from './views/AIAgentView.js';
import { LeadDetailModal } from './components/LeadDetailModal.js';
import { WhatsAppAutoSenderModal } from './components/modals/WhatsAppAutoSenderModal.js';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

function MainLayout() {
  const { 
    activeView, 
    leads,
    selectedLead, 
    setSelectedLead, 
    isAutoSenderOpen,
    setIsAutoSenderOpen,
    templates, 
    senderName, 
    senderPhone,
    updateLeadStatus, 
    updateLeadNotes,
    notification 
  } = useApp();

  const renderView = () => {
    switch (activeView) {
      case 'radar': return <RadarView />;
      case 'autopilot': return <AutopilotView />;
      case 'ai-agent': return <AIAgentView />;
      case 'kanban': return <KanbanView />;
      case 'leads': return <LeadsView />;
      case 'templates': return <TemplatesView />;
      case 'analytics': return <AnalyticsView />;
      case 'settings': return <SettingsView />;
      default: return <RadarView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-6 relative">
          {/* Toast Notification */}
          {notification && (
            <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl text-xs font-semibold flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 border ${
              notification.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50'
                : notification.type === 'error'
                ? 'bg-red-950/95 text-red-300 border-red-500/50 shadow-red-950/50'
                : 'bg-indigo-950/95 text-indigo-300 border-indigo-500/50 shadow-indigo-950/50'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
          )}

          {/* Active View Router */}
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>

      {/* Full Lead Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          templates={templates}
          senderName={senderName}
          senderPhone={senderPhone}
          onClose={() => setSelectedLead(null)}
          onUpdateStatus={updateLeadStatus}
          onUpdateNotes={updateLeadNotes}
        />
      )}

      {/* Auto Sender Pilot Modal */}
      {isAutoSenderOpen && (
        <WhatsAppAutoSenderModal
          leads={leads.filter(l => l.status === 'novo' || l.status === 'contatado')}
          templates={templates}
          senderName={senderName}
          senderPhone={senderPhone}
          onClose={() => setIsAutoSenderOpen(false)}
          onUpdateStatus={updateLeadStatus}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
