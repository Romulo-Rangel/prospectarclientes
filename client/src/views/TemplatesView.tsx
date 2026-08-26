import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { OutreachTemplatesModal } from '../components/OutreachTemplatesModal.js';
import { MessageSquare, Sparkles, Send, Copy, Check, User, Building } from 'lucide-react';
import { api } from '../services/api.js';

export const TemplatesView: React.FC = () => {
  const { templates, leads, senderName, refreshData, showNotification } = useApp();
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id || '');
  const [selectedTplId, setSelectedTplId] = useState<string>(templates[0]?.id || '');
  const [copied, setCopied] = useState(false);

  const currentLead = leads.find(l => l.id === selectedLeadId) || leads[0] || {
    name: 'Restaurante Exemplo Ltda',
    category: 'Restaurantes',
    city: 'Lisboa',
    country: 'Portugal',
    phone: '+351 912 345 678',
    website: ''
  };

  const currentTemplate = templates.find(t => t.id === selectedTplId) || templates[0];

  const renderMessage = () => {
    if (!currentTemplate) return '';
    const replacements: Record<string, string> = {
      '{{empresa}}': currentLead.name || 'Empresa',
      '{{nicho}}': currentLead.category || 'seu setor',
      '{{cidade}}': currentLead.city || 'sua região',
      '{{pais}}': currentLead.country || 'Brasil',
      '{{website}}': currentLead.website || 'não cadastrado',
      '{{meu_nome}}': senderName || 'Especialista em Soluções Web',
      '{{diagnostico}}': currentLead.website ? 'site com instabilidade' : 'ausência de website próprio'
    };

    let text = currentTemplate.content;
    for (const [k, v] of Object.entries(replacements)) {
      text = text.split(k).join(v);
    }
    return text;
  };

  const rendered = renderMessage();
  const rawCleanPhone = currentLead.formatted_phone || currentLead.phone?.replace(/\D/g, '');
  const whatsappUrl = rawCleanPhone ? `https://wa.me/${rawCleanPhone}?text=${encodeURIComponent(rendered)}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(rendered);
    setCopied(true);
    showNotification('Mensagem copiada para a área de transferência!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Live Testing Simulator */}
      <div className="glass-panel p-6 border-indigo-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Simulador & Gerador de Abordagem em Tempo Real
            </h3>
            <p className="text-xs text-slate-400">
              Selecione um lead da sua base e visualize a mensagem adaptada antes de enviar
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Select Lead */}
            {leads.length > 0 && (
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="glass-input text-xs font-semibold py-1.5 px-3 max-w-[220px]"
              >
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.city})
                  </option>
                ))}
              </select>
            )}

            {/* Select Template */}
            <select
              value={selectedTplId}
              onChange={(e) => setSelectedTplId(e.target.value)}
              className="glass-input text-xs font-semibold py-1.5 px-3 max-w-[220px]"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
          <div className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
            {rendered}
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Lead selecionado: <strong className="text-white">{currentLead.name}</strong> ({currentLead.category} em {currentLead.city}, {currentLead.country})
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Abrir no WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Templates Manager Component */}
      <OutreachTemplatesModal
        templates={templates}
        onReloadTemplates={refreshData}
      />
    </div>
  );
};
