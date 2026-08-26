import React from 'react';
import { LeadsTable } from '../components/LeadsTable.js';
import { useApp } from '../context/AppContext.js';

export const LeadsView: React.FC = () => {
  const { leads, setSelectedLead, updateLeadStatus, deleteLead, clearAllLeads, setIsAutoSenderOpen } = useApp();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white">Base Consolidada de Leads ({leads.length})</h2>
          <p className="text-xs text-slate-400">Filtragem detalhada, auditoria de websites e controle de abordagem</p>
        </div>

        {leads.length > 0 && (
          <button
            onClick={() => setIsAutoSenderOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98]"
          >
            <span>Disparo em Massa WhatsApp 🚀</span>
          </button>
        )}
      </div>

      <LeadsTable
        leads={leads}
        onSelectLead={setSelectedLead}
        onUpdateStatus={updateLeadStatus}
        onDeleteLead={deleteLead}
        onClearAll={clearAllLeads}
      />
    </div>
  );
};
