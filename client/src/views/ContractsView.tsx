import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { 
  FileText, CheckCircle2, Download, Send, Plus, Trash2, 
  Save, Eye, RefreshCw, Sparkles, DollarSign, Clock, ShieldCheck, Globe2 
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CONTRACT_LANGUAGES = [
  { id: 'BR', label: 'Português (Brasil)', flag: '🇧🇷', currency: 'Real (R$)', defaultCountry: 'Brasil' },
  { id: 'US', label: 'English (USA & Global)', flag: '🇺🇸', currency: 'USD ($)', defaultCountry: 'Estados Unidos' },
  { id: 'ES', label: 'Español (España & Europa)', flag: '🇪🇸', currency: 'Euro (€)', defaultCountry: 'Espanha' },
  { id: 'PT', label: 'Português (Portugal)', flag: '🇵🇹', currency: 'Euro (€)', defaultCountry: 'Portugal' }
];

export const ContractsView: React.FC = () => {
  const { senderName, senderPhone, showNotification } = useApp();
  const [selectedLang, setSelectedLang] = useState<string>('BR');
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  
  const [template, setTemplate] = useState<{
    title: string;
    providerName: string;
    providerPhone: string;
    providerDoc: string;
    serviceTitle: string;
    defaultPrice: string;
    defaultPaymentTerms: string;
    defaultDeliveryDays: number;
    clauses: string[];
  }>({
    title: '',
    providerName: '',
    providerPhone: '',
    providerDoc: '',
    serviceTitle: '',
    defaultPrice: '',
    defaultPaymentTerms: '',
    defaultDeliveryDays: 10,
    clauses: []
  });

  const [contractsList, setContractsList] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadTemplate = async (lang: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/contracts/template?lang=${lang}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.title) {
        setTemplate(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadContracts = async () => {
    try {
      const res = await fetch('/api/contracts/list');
      if (!res.ok) return;
      const data = await res.json();
      setContractsList(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTemplate(selectedLang);
    loadContracts();
  }, [selectedLang]);

  const handleSelectLang = (lang: string) => {
    setSelectedLang(lang);
  };

  const handleSaveTemplate = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/contracts/template?lang=${selectedLang}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...template, lang: selectedLang })
      });
      if (!res.ok) throw new Error('Erro ao salvar modelo');
      showNotification(`Modelo de contrato (${selectedLang}) salvo com sucesso!`, 'success');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddClause = () => {
    const clauseNum = template.clauses.length + 1;
    const prefix = selectedLang === 'US' ? `SECTION ${clauseNum} - New Clause:` : selectedLang === 'ES' ? `CLÁUSULA ${clauseNum}ª - Nueva Cláusula:` : `CLÁUSULA ${clauseNum}ª - Nova Cláusula:`;
    setTemplate({
      ...template,
      clauses: [...template.clauses, `${prefix} Descreva os termos aqui.`]
    });
  };

  const handleUpdateClause = (index: number, val: string) => {
    const updated = [...template.clauses];
    updated[index] = val;
    setTemplate({ ...template, clauses: updated });
  };

  const handleDeleteClause = (index: number) => {
    const updated = template.clauses.filter((_, i) => i !== index);
    setTemplate({ ...template, clauses: updated });
  };

  const activeLangInfo = CONTRACT_LANGUAGES.find(l => l.id === selectedLang) || CONTRACT_LANGUAGES[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-slate-950 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50 flex items-center gap-1.5 uppercase tracking-wider">
                <Globe2 className="w-3.5 h-3.5" />
                Contratos Multilíngues (4 Idiomas)
              </span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Moeda: {activeLangInfo.currency} ({activeLangInfo.label})
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Revisor & Editor de Contratos Internacionais (PDF)
            </h2>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Personalize o modelo de contrato em <strong>Inglês (Dólar $)</strong>, <strong>Espanhol (Euro €)</strong> ou <strong>Português (PT/BR)</strong>. Quando a IA fechar um lead, ela seleciona o contrato no idioma nativo e <strong>anexa o PDF direto no WhatsApp</strong>!
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'editor' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Revisar Modelos
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Contratos Gerados ({contractsList.length})
            </button>
          </div>
        </div>

        {/* Language Selection Buttons */}
        {activeTab === 'editor' && (
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
              Selecione o Idioma do Modelo para Editar:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CONTRACT_LANGUAGES.map((lang) => {
                const isSelected = selectedLang === lang.id;
                return (
                  <button
                    key={lang.id}
                    onClick={() => handleSelectLang(lang.id)}
                    className={`p-3 rounded-xl text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-950/90 border-indigo-500 text-white shadow-lg shadow-indigo-950/50 scale-[1.02]'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{lang.flag}</span>
                      <div>
                        <div className="text-xs font-bold text-white">{lang.label}</div>
                        <div className="text-[10px] text-emerald-400 font-mono font-semibold">{lang.currency}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {activeTab === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form & Clauses Editor */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 border-slate-800 space-y-5">
              <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Dados do Modelo: {activeLangInfo.flag} {activeLangInfo.label}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">{activeLangInfo.currency}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Título do Contrato:</label>
                  <input
                    type="text"
                    value={template.title}
                    onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                    className="glass-input w-full text-xs py-2 px-3 mt-1 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Prestador / Sua Empresa:</label>
                  <input
                    type="text"
                    value={template.providerName}
                    onChange={(e) => setTemplate({ ...template, providerName: e.target.value })}
                    className="glass-input w-full text-xs py-2 px-3 mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Seu WhatsApp de Contato:</label>
                  <input
                    type="text"
                    value={template.providerPhone}
                    onChange={(e) => setTemplate({ ...template, providerPhone: e.target.value })}
                    className="glass-input w-full text-xs py-2 px-3 mt-1"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Título do Serviço:</label>
                  <input
                    type="text"
                    value={template.serviceTitle}
                    onChange={(e) => setTemplate({ ...template, serviceTitle: e.target.value })}
                    className="glass-input w-full text-xs py-2 px-3 mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Valor Padrão Sugerido:</label>
                  <input
                    type="text"
                    value={template.defaultPrice}
                    onChange={(e) => setTemplate({ ...template, defaultPrice: e.target.value })}
                    className="glass-input w-full text-xs py-2 px-3 mt-1 font-mono text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Prazo de Entrega (Dias Úteis):</label>
                  <input
                    type="number"
                    value={template.defaultDeliveryDays}
                    onChange={(e) => setTemplate({ ...template, defaultDeliveryDays: Number(e.target.value) })}
                    className="glass-input w-full text-xs py-2 px-3 mt-1 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Condições de Pagamento:</label>
                  <input
                    type="text"
                    value={template.defaultPaymentTerms}
                    onChange={(e) => setTemplate({ ...template, defaultPaymentTerms: e.target.value })}
                    className="glass-input w-full text-xs py-2 px-3 mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Clauses Editor */}
            <div className="glass-panel p-6 border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Cláusulas e Termos Legais ({template.clauses?.length || 0})
                </h3>

                <button
                  onClick={handleAddClause}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Cláusula</span>
                </button>
              </div>

              <div className="space-y-3">
                {template.clauses?.map((clause, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                    <span className="text-xs font-mono font-bold text-indigo-400 pt-1">
                      #{idx + 1}
                    </span>
                    <textarea
                      rows={3}
                      value={clause}
                      onChange={(e) => handleUpdateClause(idx, e.target.value)}
                      className="flex-1 bg-transparent border-none text-xs text-slate-200 resize-none focus:outline-none leading-relaxed font-sans"
                    />
                    <button
                      onClick={() => handleDeleteClause(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Excluir cláusula"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="pt-3">
                <button
                  onClick={handleSaveTemplate}
                  disabled={isSaving}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98]"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Salvar Modelo em {activeLangInfo.label} ({activeLangInfo.flag})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Live Document Preview */}
          <div className="glass-panel p-6 border-slate-800 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Eye className="w-4 h-4 text-amber-400" />
                Prévia do PDF ({activeLangInfo.flag} {selectedLang})
              </h3>

              <div className="mt-4 p-5 rounded-2xl bg-white text-slate-900 shadow-2xl space-y-3 font-sans text-[10px] leading-relaxed max-h-[520px] overflow-y-auto border border-slate-200">
                <div className="text-center font-bold text-xs uppercase border-b border-slate-300 pb-2 text-indigo-950">
                  {template.title}
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-slate-900">1. {selectedLang === 'US' ? 'PARTIES:' : 'IDENTIFICAÇÃO:'}</div>
                  <div className="text-slate-700">{selectedLang === 'US' ? 'PROVIDER:' : 'CONTRATADA:'} {template.providerName}</div>
                  <div className="text-slate-700">{selectedLang === 'US' ? 'CLIENT:' : 'CONTRATANTE:'} [Business Name] | {selectedLang === 'US' ? 'City/State:' : 'Cidade:'} [City]</div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-slate-900">2. {selectedLang === 'US' ? 'TERMS:' : 'CONDIÇÕES COMERCIAIS:'}</div>
                  <div className="text-slate-700">• {selectedLang === 'US' ? 'Service:' : 'Serviço:'} {template.serviceTitle}</div>
                  <div className="text-slate-700 font-bold text-emerald-800">• {selectedLang === 'US' ? 'Total Investment:' : 'Valor:'} {template.defaultPrice}</div>
                  <div className="text-slate-700">• {selectedLang === 'US' ? 'Payment Terms:' : 'Condições:'} {template.defaultPaymentTerms}</div>
                  <div className="text-slate-700">• {selectedLang === 'US' ? 'Timeline:' : 'Prazo:'} {template.defaultDeliveryDays} {selectedLang === 'US' ? 'business days' : 'dias úteis'}</div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="font-bold text-slate-900">3. {selectedLang === 'US' ? 'CLAUSES:' : 'CLÁUSULAS:'}</div>
                  {template.clauses?.map((c, i) => (
                    <div key={i} className="text-slate-600 text-[9px] line-clamp-3">{c}</div>
                  ))}
                </div>

                <div className="pt-4 grid grid-cols-2 gap-2 text-center text-[8px] font-bold border-t border-slate-300">
                  <div>{selectedLang === 'US' ? 'SERVICE PROVIDER' : 'CONTRATADA'}</div>
                  <div>{selectedLang === 'US' ? 'CLIENT' : 'CONTRATANTE'}</div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Inteligência de Envio da IA:
              </span>
              <p className="text-[10px] leading-relaxed">
                Ao fechar com um lead nos EUA, a IA anexa este PDF em <strong>Inglês com valor em Dólar</strong>. Se for em Portugal ou Espanha, ela gera o PDF em <strong>Euro</strong>!
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Contracts History Tab */
        <div className="glass-panel p-6 border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Histórico de Contratos Emitidos
              </h3>
              <p className="text-xs text-slate-400">Todos os contratos gerados e enviados para clientes</p>
            </div>

            <button
              onClick={loadContracts}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Cliente / Empresa</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Valor Acordado</th>
                  <th className="px-4 py-3">Data de Emissão</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {contractsList.length > 0 ? (
                  contractsList.map((ctr) => (
                    <tr key={ctr.id} className="hover:bg-slate-900/40">
                      <td className="px-4 py-3.5 font-bold text-white">
                        {ctr.lead_name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-emerald-400">
                        {ctr.client_phone}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-300">
                        {ctr.total_value}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {new Date(ctr.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                          {ctr.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <a
                          href={`/api/contracts/download/${ctr.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3 h-3" />
                          <span>Baixar PDF</span>
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500 text-xs">
                      Nenhum contrato gerado ainda. Quando a IA fechar um lead, o contrato aparecerá aqui automaticamente!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
