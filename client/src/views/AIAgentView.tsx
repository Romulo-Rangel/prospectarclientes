import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { 
  Bot, QrCode, Smartphone, Zap, Sparkles, CheckCircle2, 
  AlertCircle, MessageSquare, Send, RefreshCw, Power, 
  Flame, ThumbsUp, ThumbsDown, Clock, ShieldCheck, Check,
  Utensils, Moon, Sun, Save, Sliders, Laptop
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AIAgentView: React.FC = () => {
  const { senderName, senderPhone, showNotification } = useApp();
  const [statusData, setStatusData] = useState<{
    status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected';
    qrCode: string | null;
    phone: string | null;
    isAutoReplyEnabled: boolean;
    stats: {
      totalConversations: number;
      closingDeals: number;
      negotiatingDeals: number;
      rejectedDeals: number;
      totalMessages: number;
    };
  } | null>(null);

  const [businessHours, setBusinessHours] = useState<{
    isWorkingTime: boolean;
    isLunchTime: boolean;
    statusText: string;
    badgeType: 'open' | 'lunch' | 'closed';
    workStartTime: string;
    workEndTime: string;
    lunchStartTime: string;
    lunchEndTime: string;
    respectBusinessHours: boolean;
  }>({
    isWorkingTime: true,
    isLunchTime: false,
    statusText: '🟢 Em Horário Comercial (09:00 às 18:00) - 8h Diárias',
    badgeType: 'open',
    workStartTime: '09:00',
    workEndTime: '18:00',
    lunchStartTime: '12:00',
    lunchEndTime: '13:00',
    respectBusinessHours: true
  });

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [manualText, setManualText] = useState('');
  const [isSendingManual, setIsSendingManual] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [showHoursConfig, setShowHoursConfig] = useState(false);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/ai-agent/status');
      if (!res.ok) return;
      const data = await res.json();
      setStatusData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBusinessHours = async () => {
    try {
      const res = await fetch('/api/ai-agent/business-hours');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.workStartTime) {
        setBusinessHours(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/ai-agent/conversations');
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data);
      if (!selectedConversation && data.length > 0) {
        setSelectedConversation(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadThread = async (phoneOrLeadId: string) => {
    try {
      const res = await fetch(`/api/ai-agent/conversations/${phoneOrLeadId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStatus();
    loadBusinessHours();
    loadConversations();
    const interval = setInterval(() => {
      loadStatus();
      loadBusinessHours();
      loadConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadThread(selectedConversation.phone);
    }
  }, [selectedConversation]);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      showNotification('Conectando ao WhatsApp Socket e gerando QR Code...', 'info');
      await fetch('/api/ai-agent/connect', { method: 'POST' });
      await loadStatus();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/ai-agent/disconnect', { method: 'POST' });
      showNotification('Sessão do WhatsApp desconectada', 'info');
      await loadStatus();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleToggleAutoReply = async () => {
    if (!statusData) return;
    const newState = !statusData.isAutoReplyEnabled;
    try {
      await fetch('/api/ai-agent/toggle-auto-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });
      setStatusData({ ...statusData, isAutoReplyEnabled: newState });
      showNotification(newState ? 'IA ativada para responder clientes!' : 'IA pausada.', 'success');
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleSaveBusinessHours = async () => {
    try {
      setIsSavingHours(true);
      const res = await fetch('/api/ai-agent/business-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(businessHours)
      });
      const data = await res.json();
      if (data && data.workStartTime) {
        setBusinessHours(data);
      }
      showNotification('Horário comercial e intervalo de almoço atualizados com sucesso!', 'success');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      setShowHoursConfig(false);
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsSavingHours(false);
    }
  };

  const handleSendManualMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim() || !selectedConversation || isSendingManual) return;

    try {
      setIsSendingManual(true);
      const res = await fetch('/api/ai-agent/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedConversation.phone,
          text: manualText.trim(),
          leadId: selectedConversation.lead_id,
          leadName: selectedConversation.lead_name
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }

      setManualText('');
      await loadThread(selectedConversation.phone);
      showNotification('Mensagem enviada com sucesso no WhatsApp!', 'success');
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsSendingManual(false);
    }
  };

  const stats = statusData?.stats || { totalConversations: 0, closingDeals: 0, negotiatingDeals: 0, rejectedDeals: 0, totalMessages: 0 };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Center */}
      <div className="glass-panel p-6 border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-slate-950 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {statusData?.status === 'connected' ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  WhatsApp Conectado ({statusData.phone})
                </span>
              ) : statusData?.status === 'qr_ready' ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/50 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Aguardando Leitura do QR Code
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  WhatsApp Desconectado
                </span>
              )}

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50 flex items-center gap-1">
                <Laptop className="w-3 h-3 text-cyan-400" />
                IA Consultora Expert em Tecnologia
              </span>

              {/* Sincronização Phone Badge */}
              <span className="text-[10px] text-slate-300 flex items-center gap-1 font-medium bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
                <Smartphone className="w-3 h-3 text-emerald-400" />
                Sincronizado no seu Celular em Tempo Real
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              IA Comercial & Consultora de Tecnologia
            </h2>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              O robô atua como um <strong>Arquiteto de Software & Consultor Tecnológico</strong>, explicando com clareza a solução que o cliente precisa (eliminar taxas de delivery, agendamento 24h, velocidade PageSpeed 95+), operando em <strong>jornada de 8h comerciais</strong> com pausa de almoço!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {statusData?.status === 'connected' ? (
              <>
                <button
                  onClick={handleToggleAutoReply}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${
                    statusData.isAutoReplyEnabled
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/30'
                      : 'bg-amber-600/20 text-amber-300 border-amber-500/50 hover:bg-amber-600/30'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>{statusData.isAutoReplyEnabled ? 'IA Respondendo Ativamente' : 'Auto-Resposta Pausada'}</span>
                </button>

                <button
                  onClick={handleDisconnect}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Desconectar</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                <span>Conectar WhatsApp (Escanear QR Code)</span>
              </button>
            )}
          </div>
        </div>

        {/* QR Code Presentation Box (When QR is available) */}
        {statusData?.status === 'qr_ready' && statusData.qrCode && (
          <div className="mt-6 p-5 rounded-2xl bg-slate-950/90 border border-amber-500/40 flex flex-col md:flex-row items-center gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 bg-white rounded-2xl shadow-2xl flex-shrink-0">
              <img src={statusData.qrCode} alt="WhatsApp QR Code" className="w-48 h-48 rounded-lg" />
            </div>

            <div className="space-y-3 text-center md:text-left">
              <h3 className="text-base font-bold text-white flex items-center justify-center md:justify-start gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                Como Conectar em 10 Segundos:
              </h3>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Abra o <strong>WhatsApp</strong> no seu celular;</li>
                <li>Toque nos <strong>3 pontinhos</strong> (Android) ou <strong>Configurações</strong> (iPhone);</li>
                <li>Toque em <strong>"Aparelhos Conectados"</strong> e depois em <strong>"Conectar um Aparelho"</strong>;</li>
                <li>Aponte a câmera do celular para este <strong>QR Code</strong>!</li>
              </ol>
              <p className="text-[11px] text-slate-400">
                🔒 Conexão segura e criptografada direto no seu Node.js.
              </p>
            </div>
          </div>
        )}

        {/* Business Hours & Lunch Break Card */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Jornada de Trabalho (8 Horas / Dia) & Intervalo de Almoço:
                </span>
                
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                  businessHours.badgeType === 'open' 
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700/50' 
                    : businessHours.badgeType === 'lunch'
                    ? 'bg-amber-950 text-amber-300 border-amber-700/50'
                    : 'bg-indigo-950 text-indigo-300 border-indigo-800/50'
                }`}>
                  {businessHours.badgeType === 'open' ? <Sun className="w-3 h-3 text-emerald-400" /> : businessHours.badgeType === 'lunch' ? <Utensils className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-400" />}
                  {businessHours.statusText}
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                Expediente: <strong>{businessHours.workStartTime} às {businessHours.workEndTime}</strong> | Pausa de Almoço: <strong>{businessHours.lunchStartTime} às {businessHours.lunchEndTime}</strong> (Segunda a Sexta).
              </p>
            </div>

            <button
              onClick={() => setShowHoursConfig(!showHoursConfig)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showHoursConfig ? 'Ocultar Ajustes' : 'Configurar Horários'}</span>
            </button>
          </div>

          {/* Expandable Hours Form */}
          {showHoursConfig && (
            <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 grid grid-cols-1 sm:grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-150">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Início do Expediente:</label>
                <input
                  type="time"
                  value={businessHours.workStartTime}
                  onChange={(e) => setBusinessHours({ ...businessHours, workStartTime: e.target.value })}
                  className="glass-input w-full text-xs py-1.5 px-2 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Fim do Expediente:</label>
                <input
                  type="time"
                  value={businessHours.workEndTime}
                  onChange={(e) => setBusinessHours({ ...businessHours, workEndTime: e.target.value })}
                  className="glass-input w-full text-xs py-1.5 px-2 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-amber-300 block mb-1">Início do Almoço:</label>
                <input
                  type="time"
                  value={businessHours.lunchStartTime}
                  onChange={(e) => setBusinessHours({ ...businessHours, lunchStartTime: e.target.value })}
                  className="glass-input w-full text-xs py-1.5 px-2 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-amber-300 block mb-1">Fim do Almoço:</label>
                <input
                  type="time"
                  value={businessHours.lunchEndTime}
                  onChange={(e) => setBusinessHours({ ...businessHours, lunchEndTime: e.target.value })}
                  className="glass-input w-full text-xs py-1.5 px-2 font-mono"
                />
              </div>

              <div className="sm:col-span-4 flex items-center justify-between pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={businessHours.respectBusinessHours}
                    onChange={(e) => setBusinessHours({ ...businessHours, respectBusinessHours: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Respeitar Jornada Comercial de 8h e Pausa de Almoço (Seg a Sex)</span>
                </label>

                <button
                  onClick={handleSaveBusinessHours}
                  disabled={isSavingHours}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-md"
                >
                  {isSavingHours ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Salvar Horários</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Metrics Row */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              Querem Fechar:
            </span>
            <div className="text-xl font-bold text-white font-mono">{stats.closingDeals} empresas</div>
            <span className="text-[10px] text-emerald-400">Alta intenção de compra</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              Em Negociação:
            </span>
            <div className="text-xl font-bold text-amber-400 font-mono">{stats.negotiatingDeals} conversas</div>
            <span className="text-[10px] text-slate-500">Tirando dúvidas / Preços</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <ThumbsDown className="w-3.5 h-3.5" />
              Recusas Respeitadas:
            </span>
            <div className="text-xl font-bold text-slate-300 font-mono">{stats.rejectedDeals}</div>
            <span className="text-[10px] text-slate-500">Descartados educadamente</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" />
              Total Atendidos:
            </span>
            <div className="text-xl font-bold text-indigo-300 font-mono">{stats.totalConversations}</div>
            <span className="text-[10px] text-slate-500">{stats.totalMessages} mensagens</span>
          </div>
        </div>
      </div>

      {/* Live Conversations Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
        {/* Left: Conversations List */}
        <div className="glass-panel border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Conversas em Tempo Real ({conversations.length})
            </h3>
            <button
              onClick={() => { loadConversations(); loadStatus(); }}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400"
              title="Atualizar"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-[550px] flex-1">
            {conversations.length > 0 ? (
              conversations.map((conv) => {
                const isSelected = selectedConversation?.phone === conv.phone;
                const decision = conv.latest_ai_decision;

                return (
                  <button
                    key={conv.phone}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 text-left transition-colors flex flex-col gap-1.5 ${
                      isSelected ? 'bg-indigo-950/60 border-l-4 border-indigo-500' : 'hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[170px]">
                        {conv.lead_name || 'Cliente'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {conv.last_activity ? new Date(conv.last_activity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
                      {conv.last_sender === 'ai' ? '🤖 IA: ' : '👤 '}{conv.last_message}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-slate-500">{conv.phone}</span>
                      
                      {decision === 'interessado_fechar' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                          🟢 Quer Fechar
                        </span>
                      ) : decision === 'negociando' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-700/50">
                          🟡 Negociando
                        </span>
                      ) : decision === 'recusou' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-800">
                          🔴 Recusou
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                          💬 Em Atendimento
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nenhuma conversa registrada ainda. Conecte o WhatsApp acima para a IA iniciar os atendimentos!
              </div>
            )}
          </div>
        </div>

        {/* Right: Message Thread */}
        <div className="lg:col-span-2 glass-panel border-slate-800 flex flex-col justify-between overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedConversation.lead_name || 'Cliente'}</span>
                    <span className="text-xs font-mono text-emerald-400">({selectedConversation.phone})</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Sincronizado diretamente com seu WhatsApp no celular
                  </p>
                </div>

                <button
                  onClick={() => loadThread(selectedConversation.phone)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400"
                  title="Atualizar mensagens"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Message History Feed */}
              <div className="p-4 space-y-3 overflow-y-auto max-h-[440px] flex-1 bg-slate-950/40">
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const isFromLead = msg.sender === 'lead';
                    const isFromAI = msg.sender === 'ai';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isFromLead ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-md space-y-1 ${
                            isFromLead
                              ? 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                              : isFromAI
                              ? 'bg-gradient-to-r from-indigo-950 to-purple-950 text-indigo-100 border border-indigo-800/60 rounded-tr-none'
                              : 'bg-emerald-950 text-emerald-100 border border-emerald-800/60 rounded-tr-none'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[9px] font-bold opacity-75 border-b border-white/10 pb-1">
                            <span>{isFromLead ? '👤 CLIENTE' : isFromAI ? '🤖 IA CONSULTORA' : '🧑 VOCÊ (MANUAL)'}</span>
                            <span className="font-mono">{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>

                          <div className="whitespace-pre-wrap leading-relaxed">
                            {msg.message}
                          </div>

                          {msg.ai_reasoning && (
                            <div className="mt-1 pt-1 border-t border-indigo-500/20 text-[9px] text-indigo-300 italic flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                              Raciocínio IA: {msg.ai_reasoning}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Carregando mensagens da conversa...
                  </div>
                )}
              </div>

              {/* Reply Input Box */}
              <form onSubmit={handleSendManualMessage} className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Digitar resposta manual ou instrução para o cliente..."
                  className="glass-input flex-1 text-xs py-2 px-3"
                  disabled={isSendingManual || statusData?.status !== 'connected'}
                />
                <button
                  type="submit"
                  disabled={isSendingManual || !manualText.trim() || statusData?.status !== 'connected'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                >
                  {isSendingManual ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Enviar</span>
                </button>
              </form>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center h-full">
              <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
              <span>Selecione uma conversa ao lado para visualizar o histórico completo</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
