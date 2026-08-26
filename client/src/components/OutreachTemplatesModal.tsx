import React, { useState } from 'react';
import { Template } from '../types.js';
import { MessageSquare, Plus, Trash2, Edit3, Check, Save, Sparkles, HelpCircle } from 'lucide-react';
import { api } from '../services/api.js';

interface OutreachTemplatesModalProps {
  templates: Template[];
  onReloadTemplates: () => Promise<void>;
}

export const OutreachTemplatesModal: React.FC<OutreachTemplatesModalProps> = ({
  templates,
  onReloadTemplates
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    channel: 'whatsapp' | 'email' | 'instagram' | 'call';
    target_country: string;
    subject: string;
    content: string;
  }>({
    name: '',
    channel: 'whatsapp',
    target_country: 'ALL',
    subject: '',
    content: ''
  });

  const handleStartEdit = (t: Template) => {
    setEditingId(t.id);
    setIsCreating(false);
    setFormData({
      name: t.name,
      channel: t.channel,
      target_country: t.target_country || 'ALL',
      subject: t.subject || '',
      content: t.content
    });
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      name: 'Novo Modelo de Mensagem',
      channel: 'whatsapp',
      target_country: 'ALL',
      subject: '',
      content: `Olá! Sou {{meu_nome}} e trabalho com desenvolvimento de sistemas web para {{nicho}} em {{cidade}}.\n\nNotei que a *{{empresa}}* tem grande potencial e gostaria de apresentar uma proposta sob medida.`
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) return;
    try {
      if (isCreating) {
        await api.createTemplate(formData);
      } else if (editingId) {
        await api.updateTemplate(editingId, formData);
      }
      setEditingId(null);
      setIsCreating(false);
      await onReloadTemplates();
    } catch (err: any) {
      alert('Erro ao salvar modelo: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este modelo?')) return;
    try {
      await api.deleteTemplate(id);
      await onReloadTemplates();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + ' ' + variable
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header & Add button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            Modelos de Mensagens & Scripts Prontos
          </h2>
          <p className="text-xs text-slate-400">
            Personalize abordagens persuasivas para WhatsApp, E-mail e redes sociais adaptadas para qualquer país
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Novo Modelo
        </button>
      </div>

      {/* Editor Box */}
      {(isCreating || editingId) && (
        <div className="glass-panel p-6 border-indigo-500/40 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-400" />
              {isCreating ? 'Criar Novo Modelo' : 'Editar Modelo'}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingId(null);
                  setIsCreating(false);
                }}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Modelo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nome do Modelo</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="glass-input w-full text-xs"
                placeholder="ex: WhatsApp Brasil - Sem Site"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Canal de Envio</label>
              <select
                value={formData.channel}
                onChange={e => setFormData({ ...formData, channel: e.target.value as any })}
                className="glass-input w-full text-xs font-medium"
              >
                <option value="whatsapp">📱 WhatsApp</option>
                <option value="email">✉️ E-mail</option>
                <option value="instagram">📸 Instagram Direct</option>
                <option value="call">📞 Script de Ligação (Cold Call)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">País Alvo</label>
              <select
                value={formData.target_country}
                onChange={e => setFormData({ ...formData, target_country: e.target.value })}
                className="glass-input w-full text-xs font-medium"
              >
                <option value="ALL">🌍 Qualquer País (Geral)</option>
                <option value="BR">🇧🇷 Brasil (PT-BR)</option>
                <option value="PT">🇵🇹 Portugal (PT-PT)</option>
                <option value="US">🇺🇸 Estados Unidos (EN)</option>
                <option value="ES">🇪🇸 Espanha (ES)</option>
              </select>
            </div>
          </div>

          {formData.channel === 'email' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Assunto do E-mail</label>
              <input
                type="text"
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                className="glass-input w-full text-xs"
                placeholder="ex: Oportunidade digital para {{empresa}} em {{cidade}}"
              />
            </div>
          )}

          {/* Tags Helper */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Conteúdo da Mensagem</label>
              <span className="text-[10px] text-slate-400">Clique para inserir variáveis dinâmicas:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['{{empresa}}', '{{nicho}}', '{{cidade}}', '{{pais}}', '{{website}}', '{{meu_nome}}', '{{diagnostico}}'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertVariable(tag)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 hover:bg-indigo-800 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>

            <textarea
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              className="glass-input w-full text-xs font-mono h-40 resize-y"
              placeholder="Digite o texto da mensagem..."
            />
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="glass-panel p-5 border-slate-800 glass-panel-hover flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{tpl.name}</h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase">
                      {tpl.channel}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      {tpl.target_country === 'ALL' ? '🌍 Geral' : tpl.target_country === 'BR' ? '🇧🇷 BR' : tpl.target_country === 'PT' ? '🇵🇹 PT' : tpl.target_country}
                    </span>
                  </div>
                  {tpl.subject && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      <strong className="text-slate-300">Assunto:</strong> {tpl.subject}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(tpl)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Editar modelo"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                    title="Excluir modelo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 font-mono whitespace-pre-wrap line-clamp-6 leading-relaxed">
                {tpl.content}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
              <span>Variáveis suportadas: &#123;&#123;empresa&#125;&#125;, &#123;&#123;cidade&#125;&#125;, &#123;&#123;meu_nome&#125;&#125;</span>
              <button
                onClick={() => handleStartEdit(tpl)}
                className="text-indigo-400 hover:underline font-semibold"
              >
                Personalizar &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
