import React, { useState, useEffect } from 'react';
import { Lead, Template } from '../../types.js';
import { 
  X, Send, Play, Pause, Square, CheckCircle2, AlertCircle, 
  Sparkles, Clock, ShieldCheck, Smartphone, ArrowRight, ExternalLink 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WhatsAppAutoSenderModalProps {
  leads: Lead[];
  templates: Template[];
  senderName: string;
  senderPhone: string;
  onClose: () => void;
  onUpdateStatus: (id: string, status: Lead['status']) => Promise<void>;
}

export const WhatsAppAutoSenderModal: React.FC<WhatsAppAutoSenderModalProps> = ({
  leads,
  templates,
  senderName,
  senderPhone,
  onClose,
  onUpdateStatus
}) => {
  const eligibleLeads = leads.filter(l => Boolean(l.formatted_phone || l.phone?.replace(/\D/g, '')));
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [delaySeconds, setDelaySeconds] = useState<number>(10);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const renderMessageForLead = (lead: Lead) => {
    if (!selectedTemplate) return '';
    const replacements: Record<string, string> = {
      '{{empresa}}': lead.name || 'Empresa',
      '{{nicho}}': lead.category || 'o seu segmento',
      '{{cidade}}': lead.city || 'sua região',
      '{{pais}}': lead.country || 'Brasil',
      '{{website}}': lead.website || 'não cadastrado',
      '{{meu_nome}}': senderName || 'Rômulo',
      '{{meu_telefone}}': senderPhone || '(27) 98817-2973',
      '{{diagnostico}}': lead.has_website ? 'site com instabilidades' : 'ausência de site próprio cadastrado',
      '{{problema}}': lead.has_website ? 'site fora do ar' : 'sem website próprio'
    };

    let text = selectedTemplate.content;
    for (const [k, v] of Object.entries(replacements)) {
      text = text.split(k).join(v);
    }
    return text;
  };

  // Timer loop for auto-sender
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isRunning && currentIndex < eligibleLeads.length) {
      if (countdown > 0) {
        timer = setTimeout(() => {
          setCountdown(prev => prev - 1);
        }, 1000);
      } else {
        // Trigger send for current lead
        const lead = eligibleLeads[currentIndex];
        const msg = renderMessageForLead(lead);
        const phone = lead.formatted_phone || lead.phone?.replace(/\D/g, '');

        if (phone) {
          const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
          window.open(url, '_blank');
          onUpdateStatus(lead.id, 'contatado');
          setCompletedCount(prev => prev + 1);
        }

        // Advance to next lead
        if (currentIndex + 1 < eligibleLeads.length) {
          setCurrentIndex(prev => prev + 1);
          setCountdown(delaySeconds);
        } else {
          setIsRunning(false);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      }
    }

    return () => clearTimeout(timer);
  }, [isRunning, countdown, currentIndex, eligibleLeads, delaySeconds]);

  const handleStart = () => {
    if (eligibleLeads.length === 0) return;
    setIsRunning(true);
    setCountdown(2); // Short initial buffer
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentIndex(0);
    setCompletedCount(0);
    setCountdown(0);
  };

  const currentLead = eligibleLeads[currentIndex];
  const progressPercent = eligibleLeads.length > 0 
    ? Math.round((completedCount / eligibleLeads.length) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl border-indigo-500/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                Piloto Automático de WhatsApp
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 uppercase">
                Disparo Inteligente
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Envio sequencial com intervalo anti-bloqueio para todos os leads qualificados
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Modelo de Mensagem
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={isRunning}
                className="glass-input w-full text-xs font-semibold"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Intervalo entre envios (Anti-Spam)
              </label>
              <select
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                disabled={isRunning}
                className="glass-input w-full text-xs font-semibold"
              >
                <option value={8}>8 segundos (Rápido)</option>
                <option value={12}>12 segundos (Recomendado Seguro)</option>
                <option value={20}>20 segundos (Ultra Seguro)</option>
              </select>
            </div>
          </div>

          {/* Progress & Live Target Box */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Progresso: {completedCount} de {eligibleLeads.length} leads enviados
              </span>
              <span className="text-emerald-400 font-mono">{progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 scanning-bar">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Current Target Lead Card */}
            {currentLead && (
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Alvo atual: </span>
                  <strong className="text-white">{currentLead.name}</strong>
                  <span className="text-slate-400 ml-1 font-mono">({currentLead.phone})</span>
                </div>

                {isRunning && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-800/40">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Disparando em {countdown}s</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Live Message Preview for Current Lead */}
          {currentLead && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Prévia da Mensagem Personalizada que será enviada
              </label>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
                {renderMessageForLead(currentLead)}
              </div>
            </div>
          )}

          {/* Controls Footer */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>O WhatsApp Web do seu computador abrirá automaticamente a cada lead.</span>
            </div>

            <div className="flex items-center gap-2">
              {isRunning ? (
                <button
                  onClick={handlePause}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/30 transition-all"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pausar Disparador</span>
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={eligibleLeads.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>{completedCount > 0 ? 'Retomar Disparo' : 'Iniciar Piloto Automático'}</span>
                </button>
              )}

              <button
                onClick={handleReset}
                disabled={isRunning || completedCount === 0}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
