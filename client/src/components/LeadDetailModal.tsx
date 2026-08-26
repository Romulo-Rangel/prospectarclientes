import React, { useState, useEffect } from 'react';
import { Lead, Template } from '../types.js';
import { 
  X, Globe, MapPin, Phone, MessageSquare, ExternalLink, Copy, Check, 
  Send, Sparkles, AlertCircle, CheckCircle2, Flame, ShieldAlert, FileText, 
  ChevronRight, Building2, Smartphone, ArrowRight, UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LeadDetailModalProps {
  lead: Lead | null;
  templates: Template[];
  senderName: string;
  senderPhone: string;
  onClose: () => void;
  onUpdateStatus: (id: string, status: Lead['status']) => Promise<void>;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  templates,
  senderName,
  senderPhone,
  onClose,
  onUpdateStatus,
  onUpdateNotes
}) => {
  if (!lead) return null;

  const [activeTab, setActiveTab] = useState<'conhecer' | 'mensagem'>('conhecer');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState(lead.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<Lead['status']>(lead.status);

  useEffect(() => {
    // Select best template based on country and site status
    const country = (lead.country || '').toLowerCase();
    if (country.includes('portugal') || country === 'pt') {
      const ptTpl = templates.find(t => t.target_country === 'PT');
      if (ptTpl) setSelectedTemplateId(ptTpl.id);
    } else if (lead.website_status === 'error' || lead.website_status === 'offline') {
      const offlineTpl = templates.find(t => t.id.includes('offline'));
      if (offlineTpl) setSelectedTemplateId(offlineTpl.id);
    } else {
      const brTpl = templates.find(t => t.target_country === 'BR');
      if (brTpl) setSelectedTemplateId(brTpl.id);
    }
  }, [lead, templates]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  // Render message replacing variables
  const renderMessage = () => {
    if (!selectedTemplate) return '';
    const replacements: Record<string, string> = {
      '{{empresa}}': lead.name || 'Empresa',
      '{{nicho}}': lead.category || 'o seu segmento',
      '{{cidade}}': lead.city || 'sua região',
      '{{pais}}': lead.country || 'Brasil',
      '{{website}}': lead.website || 'não cadastrado',
      '{{meu_nome}}': senderName || 'Rômulo',
      '{{meu_telefone}}': senderPhone || '(27) 98817-2973',
      '{{diagnostico}}': lead.has_website ? 'site com instabilidades' : 'ausência de site profissional próprio',
      '{{problema}}': lead.has_website ? 'site fora do ar' : 'sem website próprio'
    };

    let text = selectedTemplate.content;
    for (const [k, v] of Object.entries(replacements)) {
      text = text.split(k).join(v);
    }
    return text;
  };

  const renderedMessage = renderMessage();
  const rawCleanPhone = lead.formatted_phone || lead.phone?.replace(/\D/g, '') || '';
  
  // Universal WhatsApp link compatible with Desktop & Mobile phones
  const whatsappUrl = rawCleanPhone
    ? `https://api.whatsapp.com/send?phone=${rawCleanPhone}&text=${encodeURIComponent(renderedMessage)}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(renderedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleStatusChange = async (newStatus: Lead['status']) => {
    setCurrentStatus(newStatus);
    await onUpdateStatus(lead.id, newStatus);
    if (newStatus === 'convertido') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await onUpdateNotes(lead.id, notes);
    setIsSavingNotes(false);
  };

  const handleSendWhatsApp = () => {
    if (whatsappUrl) {
      // Check if user is on mobile phone
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile && rawCleanPhone) {
        // Direct native mobile app URI scheme
        window.location.href = `whatsapp://send?phone=${rawCleanPhone}&text=${encodeURIComponent(renderedMessage)}`;
      } else {
        window.open(whatsappUrl, '_blank');
      }
      handleStatusChange('contatado');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl max-h-[92vh] flex flex-col border-indigo-500/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Title & Tabs */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white">{lead.name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  lead.lead_score === 'Alta' ? 'badge-high' : lead.lead_score === 'Média' ? 'badge-med' : 'badge-low'
                }`}>
                  {lead.lead_score === 'Alta' ? '🔥 Alta Oportunidade' : `Score: ${lead.lead_score}`}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                  {lead.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                {lead.address || `${lead.city}, ${lead.country}`}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Workflow Tabs */}
          <div className="flex items-center gap-2 border-t border-slate-800/80 pt-3">
            <button
              onClick={() => setActiveTab('conhecer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'conhecer'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>1. Conhecer a Empresa & Potencial</span>
            </button>

            <button
              onClick={() => setActiveTab('mensagem')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'mensagem'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>2. Encaminhar Mensagem WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Conhecer Empresa */}
        {activeTab === 'conhecer' && (
          <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Box: Diagnostics & Website Presence */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Opportunity Highlights Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-900/80 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    💡 Por que este local é uma oportunidade para você?
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    lead.has_website ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/50' : 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                  }`}>
                    {lead.has_website ? 'Possui Site (Redesign / Sistema)' : '🔥 Sem Site (Criação do Zero)'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-200">
                    {!lead.has_website ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-amber-300 font-bold">
                          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>Empresa 100% SEM site próprio cadastrado</span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          Esta empresa depende exclusivamente de redes sociais ou da ficha do Google Maps. Ao oferecer um site institucional com catálogo de serviços e botão de agendamento no WhatsApp, a taxa de fechamento é altíssima porque ela ainda não tem presença web própria!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-indigo-300 font-bold">
                          <Globe className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          <span>Empresa já possui um site básico: {lead.website}</span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          <strong>Por que ainda é uma oportunidade?</strong> Empresas que já possuem site básico frequentemente precisam de:
                          <br />• <strong>Redesign e Modernização</strong> (layouts antigos que não funcionam bem no celular);
                          <br />• <strong>Sistemas Web Sob Medida</strong> (módulo de pedidos online, agendamentos automáticos, painel administrativo);
                          <br />• <strong>Correção de instabilidades e SEO</strong> para subir no Google.
                          <br /><span className="text-slate-500 text-[10px]">💡 Dica: Se o seu foco for apenas criar sites do zero para quem não tem nada, você pode ativar o filtro <em>"Apenas empresas SEM site"</em> na busca ou excluir este lead.</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {lead.opportunity_tags?.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-950/80 border border-indigo-700/60 text-indigo-300"
                    >
                      ✓ {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Business Details Card */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Dados de Contato & Mapa</h4>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      WhatsApp / Telefone:
                    </span>
                    <span className="font-mono font-bold text-white text-sm">
                      {lead.phone || 'Não informado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" />
                      Ficha no Google Maps:
                    </span>
                    <a
                      href={lead.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      Abrir no Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {lead.rating > 0 && (
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Avaliação do Estabelecimento:</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        ★ {lead.rating.toFixed(1)} ({lead.review_count} avaliações)
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Box: CRM Status & Next Step Button */}
            <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
              
              <div className="space-y-4">
                {/* Pipeline Status Box */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Status da Negociação (CRM)
                  </label>
                  <select
                    value={currentStatus}
                    onChange={(e) => handleStatusChange(e.target.value as Lead['status'])}
                    className="glass-input w-full text-xs font-semibold"
                  >
                    <option value="novo">🆕 Novo Lead</option>
                    <option value="contatado">💬 Mensagem Enviada / Contatado</option>
                    <option value="em_negociacao">🤝 Em Negociação</option>
                    <option value="convertido">🎉 Cliente Fechado / Convertido</option>
                    <option value="descartado">❌ Descartado</option>
                  </select>
                </div>

                {/* Notes Box */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Anotações Internas
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Falou com a recepção, pediu para enviar proposta às 16h..."
                    className="glass-input w-full text-xs h-24 resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                  >
                    {isSavingNotes ? 'Salvando...' : 'Salvar Anotação'}
                  </button>
                </div>
              </div>

              {/* Big CTA Button to go to Tab 2 */}
              <button
                onClick={() => setActiveTab('mensagem')}
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                <span>Encaminhar Mensagem WhatsApp</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>

          </div>
        )}

        {/* Tab 2: Encaminhar Mensagem WhatsApp */}
        {activeTab === 'mensagem' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            
            {/* Sender & Destination Contact Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Seu Contato (Remetente)</span>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{senderName}</span>
                    <span className="text-emerald-400 font-mono">({senderPhone})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:border-l sm:border-slate-800 sm:pl-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Destinatário (WhatsApp)</span>
                  <div className="text-xs font-bold text-white font-mono">
                    {lead.phone || <span className="text-amber-400">Telefone não detectado</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Template Selector Row */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Modelo de Abordagem Selecionado
              </label>

              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="glass-input text-xs py-1 px-3 max-w-[260px] font-semibold"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Message Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-mono selection:bg-indigo-500 selection:text-white">
                {renderedMessage}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Personalizado automaticamente com o nome da empresa e seu número</span>
                <span>Canal: WHATSAPP</span>
              </div>
            </div>

            {/* Big Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleCopy}
                className="h-12 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copiado para a Área de Transferência!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-300" />
                    <span>Copiar Mensagem Pronta</span>
                  </>
                )}
              </button>

              {whatsappUrl ? (
                <button
                  onClick={handleSendWhatsApp}
                  className="h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:shadow-emerald-600/50 hover:scale-[1.01] active:scale-[0.98]"
                >
                  <Send className="w-4 h-4" />
                  <span>Abrir no WhatsApp & Enviar 📲</span>
                </button>
              ) : (
                <button
                  disabled
                  className="h-12 px-4 rounded-xl bg-slate-800 text-slate-500 text-xs font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Phone className="w-4 h-4" />
                  <span>Sem Telefone do Destinatário</span>
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
