import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { 
  Bot, QrCode, Smartphone, Zap, Sparkles, CheckCircle2, 
  AlertCircle, MessageSquare, Send, RefreshCw, Power, 
  Flame, ThumbsUp, ThumbsDown, Clock, ShieldCheck, Check
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

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [manualText, setManualText] = useState('');
  const [isSendingManual, setIsSendingManual] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    loadConversations();
    const interval = setInterval(() => {
      loadStatus();
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
      showNotification('WhatsApp desconectado com sucesso.', 'info');
      await loadStatus();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleToggleAutoReply = async () => {
    if (!statusData) return;
    const nextState = !statusData.isAutoReplyEnabled;
    try {
      await fetch('/api/ai-agent/toggle-auto-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
      setStatusData({ ...statusData, isAutoReplyEnabled: nextState });
      showNotification(nextState ? '🤖 IA Comercial ativada para auto-resposta!' : '⏸️ Auto-resposta da IA pausada.', 'info');
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleSendManual = async () => {
    if (!manualText.trim() || !selectedConversation) return;
    try {
      setIsSendingManual(true);
      const res = await fetch('/api/ai-agent/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedConversation.phone,
          text: manualText,
          leadId: selectedConversation.lead_id,
          leadName: selectedConversation.lead_name
        })
      });
      if (!res.ok) throw new Error('Erro ao enviar mensagem');
      setManualText('');
      await loadThread(selectedConversation.phone);
      await loadConversations();
      showNotification('Mensagem enviada!', 'success');
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
            <div className="flex items-center gap-2">
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

              <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                Agente Comercial IA (SDR Vendedor)
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              IA Comercial: Atendimento, Negociação & Decisão
            </h2>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              O agente responde automaticamente no WhatsApp tirando dúvidas sobre sites e sistemas web, quebra objeções com educação, respeita recusas e identifica clientes com <strong>intenção real de fechar contrato</strong>!
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
                  <p className="text-[10px] text-slate-400">Atendimento gerenciado pelo Agente Comercial IA</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-300">
                    {messages.length} mensagens
                  </span>
                </div>
              </div>

              {/* Message List */}
              <div className="p-4 space-y-4 overflow-y-auto max-h-[420px] flex-1 bg-slate-950/30">
                {messages.map((msg) => {
                  const isLead = msg.sender === 'lead';
                  const isAI = msg.sender === 'ai';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isLead ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-slate-400">
                          {isLead ? `👤 ${msg.lead_name || 'Cliente'}` : isAI ? '🤖 IA Comercial (Rômulo)' : '👨‍💻 Você (Manual)'}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed ${
                          isLead
                            ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                            : isAI
                            ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/20 rounded-tr-none'
                            : 'bg-emerald-600 text-white rounded-tr-none'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.message}</div>

                        {/* AI Decision Stamp */}
                        {msg.ai_decision && (
                          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] opacity-80">
                            <span>Decisão: {msg.ai_decision.replace('_', ' ').toUpperCase()}</span>
                            {msg.ai_decision === 'interessado_fechar' && <span>🔥 Lead Quente!</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Manual Message Input Box (If user wants to intervene) */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendManual(); }}
                  placeholder="Enviar mensagem manual no WhatsApp (assume a conversa)..."
                  className="flex-1 glass-input text-xs py-2.5 px-4 rounded-xl"
                />
                <button
                  onClick={handleSendManual}
                  disabled={isSendingManual || !manualText.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-12 text-center text-slate-500 text-xs">
              Selecione uma conversa ao lado para acompanhar o atendimento da IA em tempo real.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
