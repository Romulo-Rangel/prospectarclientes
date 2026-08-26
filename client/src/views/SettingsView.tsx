import React from 'react';
import { useApp } from '../context/AppContext.js';
import { Settings, User, Building2, Globe, Trash2, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';

export const SettingsView: React.FC = () => {
  const { 
    senderName, setSenderName, 
    senderPhone, setSenderPhone, 
    agencyName, setAgencyName, 
    clearAllLeads, showNotification 
  } = useApp();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showNotification('Preferências e WhatsApp salvos com sucesso!', 'success');
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="glass-panel p-6 border-slate-800 space-y-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            Perfil do Remetente & Assinatura WhatsApp
          </h3>
          <p className="text-xs text-slate-400">
            Essas informações são inseridas automaticamente nos textos de abordagem gerados
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Seu Nome
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="ex: Rômulo"
                className="glass-input w-full text-xs font-medium"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Variável &#123;&#123;meu_nome&#125;&#125;</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Seu Número de WhatsApp
              </label>
              <input
                type="text"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="ex: (27) 98817-2973"
                className="glass-input w-full text-xs font-medium font-mono text-emerald-400"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Variável &#123;&#123;meu_telefone&#125;&#125;</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Empresa / Agência
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="ex: DevStudio Web Solutions"
                className="glass-input w-full text-xs font-medium"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Nome profissional</span>
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20"
          >
            Salvar Alterações
          </button>
        </form>
      </div>

      {/* Danger Zone & Data Management */}
      <div className="glass-panel p-6 border-red-900/30 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Gerenciamento da Base de Dados
          </h3>
          <p className="text-xs text-slate-400">
            Exporte ou faça a limpeza dos registros armazenados localmente no SQLite
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href={api.getExportCsvUrl()}
            download="prospects_leads.csv"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Baixar Backup em Planilha CSV
          </a>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Atenção: deseja realmente apagar todos os leads salvos? Esta ação não pode ser desfeita.')) {
                clearAllLeads();
              }
            }}
            className="px-4 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold rounded-xl border border-red-800 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Base de Leads
          </button>
        </div>
      </div>
    </div>
  );
};
