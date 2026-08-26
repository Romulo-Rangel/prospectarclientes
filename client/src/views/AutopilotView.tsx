import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { 
  Bot, Zap, Sparkles, Clock, CheckCircle2, AlertCircle, 
  Send, Settings, ShieldCheck, RefreshCw, Smartphone, Play, ExternalLink, Globe2, DollarSign 
} from 'lucide-react';
import confetti from 'canvas-confetti';

const INTERNATIONAL_MARKETS = [
  { id: 'USA', label: 'Estados Unidos (USA)', flag: '🇺🇸', currency: 'Dólar ($)', desc: 'Miami, Orlando, NY, LA, Houston, Texas...' },
  { id: 'Portugal', label: 'Portugal', flag: '🇵🇹', currency: 'Euro (€)', desc: 'Lisboa, Porto, Braga, Coimbra, Cascais...' },
  { id: 'Espanha', label: 'Espanha & Europa', flag: '🇪🇸', currency: 'Euro (€)', desc: 'Madrid, Barcelona, Valencia, Málaga...' },
  { id: 'Reino Unido', label: 'Reino Unido (UK)', flag: '🇬🇧', currency: 'Libras (£)', desc: 'London, Manchester, Birmingham, Edinburgh...' },
  { id: 'Brasil', label: 'Brasil', flag: '🇧🇷', currency: 'Real (R$)', desc: 'Vitória, SP, RJ, Curitiba, Campinas...' }
];

export const AutopilotView: React.FC = () => {
  const { senderName, senderPhone, showNotification, refreshData } = useApp();
  const [selectedMarket, setSelectedMarket] = useState<string>('USA');
  const [data, setData] = useState<{
    settings: any;
    sentToday: number;
    remainingToday: number;
    recentLogs: any[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isHunting, setIsHunting] = useState(false);

  const loadAutopilotData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/autopilot/status');
      if (!res.ok) throw new Error('Erro ao carregar dados do robô');
      const json = await res.json();
      setData(json);
      if (json.settings?.targetCountry) {
        const found = INTERNATIONAL_MARKETS.find(m => m.id === json.settings.targetCountry || json.settings.targetCountry.includes(m.id));
        if (found) setSelectedMarket(found.id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAutopilotData();
  }, []);

  const handleSelectMarket = async (marketId: string) => {
    setSelectedMarket(marketId);
    try {
      await fetch('/api/autopilot/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market: marketId })
      });
      showNotification(`🌍 Mercado alterado para ${marketId}! Cidades e nichos internacionais sincronizados.`, 'info');
      await loadAutopilotData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerHunt = async () => {
    try {
      setIsHunting(true);
      const active = INTERNATIONAL_MARKETS.find(m => m.id === selectedMarket);
      showNotification(`🤖 Robô Caçador iniciado em ${active?.label}! Buscando empresas sem site e preparando mensagens...`, 'info');

      const res = await fetch('/api/autopilot/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 10, market: selectedMarket })
      });

      if (!res.ok) throw new Error('Erro ao disparar caçador');
      const json = await res.json();

      showNotification(`🎯 Sucesso! O robô qualificou ${json.totalHunted} empresas no mercado internacional!`, 'success');
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });

      await loadAutopilotData();
      await refreshData();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao rodar robô.', 'error');
    } finally {
      setIsHunting(false);
    }
  };

  const activeMarketInfo = INTERNATIONAL_MARKETS.find(m => m.id === selectedMarket) || INTERNATIONAL_MARKETS[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-slate-950 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Caçador Internacional Ativo
              </span>
              <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                Vendas em Moeda Forte ({activeMarketInfo.currency})
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Bot className="w-6 h-6 text-indigo-400" />
              Robô Caçador: 10 Empresas/Dia (EUA & Europa)
            </h2>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Focado em prospectar no mercado americano e europeu para fechar contratos em <strong>Dólar ($) e Euro (€)</strong>. O robô varre o Google Maps nas principais cidades, identifica empresas sem site, monta o texto no idioma nativo e prepara o contato com seu número <strong>({senderPhone})</strong>.
            </p>
          </div>

          {/* Big Attack Button */}
          <div className="flex-shrink-0 w-full md:w-auto">
            <button
              onClick={handleTriggerHunt}
              disabled={isHunting}
              className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isHunting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Caçando 10 Empresas em {activeMarketInfo.label}...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-amber-300" />
                  <span>Disparar 10 Leads em {activeMarketInfo.flag} {activeMarketInfo.id} ⚡</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* International Markets Switcher */}
        <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-indigo-400" />
            Selecione o Mercado Alvo de Prospecção:
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {INTERNATIONAL_MARKETS.map(market => {
              const isSelected = selectedMarket === market.id;
              return (
                <button
                  key={market.id}
                  onClick={() => handleSelectMarket(market.id)}
                  className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                    isSelected 
                      ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-lg shadow-indigo-950/50 scale-[1.02]' 
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">{market.flag}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
                      {market.currency}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-white">{market.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">{market.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quota Stats Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Cota Diária de Segurança:</span>
            <div className="text-xl font-bold text-white font-mono">10 empresas / dia</div>
            <span className="text-[10px] text-emerald-400">Anti-Bloqueio Seguro</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Disparados Hoje:</span>
            <div className="text-xl font-bold text-indigo-400 font-mono">{data?.sentToday || 0} leads</div>
            <span className="text-[10px] text-slate-500">Registrados na base</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Idioma & Abordagem:</span>
            <div className="text-xl font-bold text-amber-400 font-mono">
              {selectedMarket === 'USA' || selectedMarket === 'Reino Unido' ? 'English (Native)' : selectedMarket === 'Espanha' ? 'Español' : selectedMarket === 'Portugal' ? 'Português (PT)' : 'Português (BR)'}
            </div>
            <span className="text-[10px] text-slate-400">Copy adaptada para o país</span>
          </div>
        </div>
      </div>

      {/* Target Companies Log Table */}
      <div className="glass-panel p-6 border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Histórico de Disparos Internacionais Recentes
            </h3>
            <p className="text-xs text-slate-400">Empresas qualificadas prontas para abordagem com 1 clique</p>
          </div>

          <button
            onClick={loadAutopilotData}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
            title="Atualizar lista"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table of logs */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Empresa Alvo</th>
                <th className="px-4 py-3">Segmento / Região</th>
                <th className="px-4 py-3">WhatsApp / Telefone</th>
                <th className="px-4 py-3">Mensagem Personalizada</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.recentLogs && data.recentLogs.length > 0 ? (
                data.recentLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-white">
                      {log.lead_name}
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      <div>{log.niche}</div>
                      <div className="text-[10px] text-slate-500">{log.city}</div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-emerald-400 font-semibold">
                      {log.phone}
                    </td>

                    <td className="px-4 py-3.5 max-w-xs truncate text-slate-400 text-[11px] font-mono">
                      {log.message_preview}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {log.whatsapp_url ? (
                        <a
                          href={log.whatsapp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                        >
                          <Send className="w-3 h-3" />
                          <span>Abrir WhatsApp</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Enviado</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500 text-xs">
                    Nenhum disparo registrado hoje. Escolha o mercado acima (ex: 🇺🇸 <strong>Estados Unidos</strong> ou 🇵🇹 <strong>Portugal</strong>) e clique em <strong>"Disparar 10 Leads"</strong>!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
