import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import { db } from '../db/database.js';
import { AIBrainService } from './ai-brain.service.js';

export class WhatsAppSocketService {
  private static sock: WASocket | null = null;
  private static qrCodeDataUrl: string | null = null;
  private static connectionStatus: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' = 'disconnected';
  private static connectedPhoneNumber: string | null = null;
  private static authDir = path.resolve(process.cwd(), 'data/baileys_auth');

  /**
   * Retorna o status atual da conexão e QR Code
   */
  public static getStatus() {
    return {
      status: this.connectionStatus,
      qrCode: this.qrCodeDataUrl,
      phone: this.connectedPhoneNumber,
      isAutoReplyEnabled: this.isAutoReplyEnabled()
    };
  }

  public static isAutoReplyEnabled(): boolean {
    try {
      const row = db.prepare('SELECT is_auto_reply_enabled FROM ai_agent_settings WHERE id = ?').get('default') as any;
      return row ? Boolean(row.is_auto_reply_enabled) : true;
    } catch {
      return true;
    }
  }

  public static setAutoReplyEnabled(enabled: boolean) {
    db.prepare('UPDATE ai_agent_settings SET is_auto_reply_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(enabled ? 1 : 0, 'default');
  }

  /**
   * Inicializa ou reconecta a sessão do WhatsApp
   */
  public static async initSocket() {
    if (this.sock && this.connectionStatus === 'connected') {
      return;
    }

    try {
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      this.connectionStatus = 'connecting';
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const { version } = await fetchLatestBaileysVersion();

      const logger = pino({ level: 'silent' });

      const sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: ['LeadHunter AI', 'Chrome', '1.0.0']
      });

      this.sock = sock;

      // Evento de credenciais atualizadas
      sock.ev.on('creds.update', saveCreds);

      // Evento de conexão e QR Code
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr);
            this.connectionStatus = 'qr_ready';
            console.log('📲 [WhatsApp Socket] Novo QR Code gerado! Disponível no painel web.');
          } catch (err: any) {
            console.error('Erro ao converter QR Code para base64:', err.message);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`🔌 [WhatsApp Socket] Conexão fechada (código ${statusCode}). Reconectar: ${shouldReconnect}`);
          this.connectionStatus = 'disconnected';
          this.qrCodeDataUrl = null;
          this.connectedPhoneNumber = null;

          if (shouldReconnect) {
            setTimeout(() => this.initSocket(), 4000);
          }
        } else if (connection === 'open') {
          this.connectionStatus = 'connected';
          this.qrCodeDataUrl = null;
          const jid = sock.user?.id || '';
          this.connectedPhoneNumber = jid.split(':')[0] || jid.split('@')[0];
          console.log(`✅ [WhatsApp Socket] Conectado com sucesso ao WhatsApp: ${this.connectedPhoneNumber}`);
        }
      });

      // Evento de mensagens recebidas
      sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
          // Ignora mensagens enviadas por nós mesmos ou de grupos
          if (msg.key.fromMe || !msg.key.remoteJid || msg.key.remoteJid.endsWith('@g.us')) {
            continue;
          }

          const fromJid = msg.key.remoteJid;
          const rawPhone = fromJid.split('@')[0];

          // Extrai o texto da mensagem
          const messageText = 
            msg.message?.conversation || 
            msg.message?.extendedTextMessage?.text || 
            msg.message?.imageMessage?.caption || 
            '';

          if (!messageText || messageText.trim() === '') continue;

          console.log(`📩 [WhatsApp Recebido] De ${rawPhone}: "${messageText}"`);

          // Processa com a IA
          await this.handleIncomingMessage(fromJid, rawPhone, messageText);
        }
      });

    } catch (err: any) {
      console.error('Erro ao inicializar WhatsApp Socket:', err.message);
      this.connectionStatus = 'disconnected';
    }
  }

  private static messageQueues = new Map<string, {
    messages: string[];
    timer: NodeJS.Timeout;
    jid: string;
    rawPhone: string;
  }>();

  /**
   * Processa a mensagem recebida com buffer inteligente para evitar múltiplas respostas seguidas
   */
  private static async handleIncomingMessage(jid: string, rawPhone: string, text: string) {
    try {
      const cleanPhone = rawPhone.replace(/\D/g, '');

      // 1. Localiza lead na base de dados de prospecção
      const lead = db.prepare(`
        SELECT * FROM leads 
        WHERE formatted_phone LIKE '%' || ? || '%' 
           OR phone LIKE '%' || ? || '%'
        LIMIT 1
      `).get(cleanPhone, cleanPhone) as any;

      // Verifica se existe histórico de prospecção iniciado pelo sistema
      const hasPriorOutreach = db.prepare(`
        SELECT id FROM chat_messages 
        WHERE phone = ? AND sender IN ('ai', 'user')
        LIMIT 1
      `).get(cleanPhone) as any;

      // 🛡️ FILTRO DE PRIVACIDADE MÁXIMA:
      // Se NÃO for um lead cadastrado e NUNCA tiver recebido mensagem do sistema,
      // é um contato pessoal (família, amigos, colegas de trabalho). A IA NÃO INTERFERE!
      if (!lead && !hasPriorOutreach) {
        console.log(`🛡️ [Filtro de Privacidade] Mensagem de ${cleanPhone} ignorada pela IA (contato pessoal/família/trabalho - não é lead).`);
        return;
      }

      // Se o lead já tiver sido descartado / pediu para não mandar mensagem, não responde
      if (lead && lead.status === 'descartado') {
        console.log(`🛑 [Filtro Lead Descartado] ${lead.name} (${cleanPhone}) marcado como descartado. Nenhuma mensagem enviada.`);
        return;
      }

      const leadId = lead ? lead.id : `lead-${cleanPhone}`;
      const leadName = lead ? lead.name : 'Cliente';

      // 2. Salva a mensagem recebida no histórico imediatamente
      const msgIdLead = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO chat_messages (id, lead_id, lead_name, phone, sender, message, created_at)
        VALUES (?, ?, ?, ?, 'lead', ?, CURRENT_TIMESTAMP)
      `).run(msgIdLead, leadId, leadName, cleanPhone, text);

      // 3. Se a auto-resposta estiver desligada, apenas registra
      if (!this.isAutoReplyEnabled()) {
        console.log('🤖 [IA Comercial] Auto-resposta desativada nas configurações. Mensagem gravada.');
        return;
      }

      // 4. Buffer de Agrupamento Inteligente (Debounce de 8 segundos)
      // Se o cliente mandar 2, 3 ou mais mensagens em sequência ("Oi", "Tudo bem?", "Quanto custa?"),
      // nós aguardamos ele terminar de digitar e respondemos TUDO DE UMA VEZ só!
      const existing = this.messageQueues.get(cleanPhone);
      if (existing) {
        clearTimeout(existing.timer);
        existing.messages.push(text);
      } else {
        this.messageQueues.set(cleanPhone, {
          messages: [text],
          timer: null as any,
          jid,
          rawPhone
        });
      }

      const currentQueue = this.messageQueues.get(cleanPhone)!;
      console.log(`⏳ [Buffer WhatsApp] ${leadName} (${cleanPhone}) mandou mensagem (${currentQueue.messages.length} no bloco). Aguardando término da digitação (8s)...`);

      currentQueue.timer = setTimeout(async () => {
        const finalQueue = this.messageQueues.get(cleanPhone);
        if (!finalQueue) return;
        this.messageQueues.delete(cleanPhone);

        const combinedText = finalQueue.messages.join('\n');
        await this.processAggregatedMessage(finalQueue.jid, finalQueue.rawPhone, leadId, leadName, combinedText, lead);
      }, 8000);

    } catch (err: any) {
      console.error('Erro ao receber mensagem:', err.message);
    }
  }

  /**
   * Executa a resposta única da IA para o bloco consolidado de mensagens
   */
  private static async processAggregatedMessage(
    jid: string,
    rawPhone: string,
    leadId: string,
    leadName: string,
    combinedText: string,
    lead: any
  ) {
    try {
      const cleanPhone = rawPhone.replace(/\D/g, '');

      // Carrega histórico recente da conversa
      const historyRows = db.prepare(`
        SELECT sender, message, created_at FROM chat_messages 
        WHERE lead_id = ? OR phone = ?
        ORDER BY created_at ASC
        LIMIT 10
      `).all(leadId, cleanPhone) as any[];

      // Cérebro da IA formula a decisão para todo o bloco de texto
      const aiDecision = AIBrainService.processIncomingMessage({
        leadId,
        leadName,
        phone: cleanPhone,
        incomingText: combinedText,
        conversationHistory: historyRows,
        senderName: 'Rômulo',
        senderPhone: '(27) 98817-2973'
      });

      console.log(`🧠 [IA Decisão Consolidada] Lead: ${leadName} | Decisão: ${aiDecision.decision.toUpperCase()} | Score: ${aiDecision.confidenceScore}%`);

      // Atualiza status do Lead no CRM
      if (lead) {
        db.prepare(`
          UPDATE leads 
          SET status = ?, 
              notes = COALESCE(notes, '') || '\n🤖 [IA]: ' || ?, 
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(aiDecision.newStatusForCRM, aiDecision.reasoning, lead.id);
      }

      // Simula digitação humana antes de enviar a resposta
      if (this.sock && this.connectionStatus === 'connected' && aiDecision.replyText) {
        await this.sock.sendPresenceUpdate('composing', jid);

        const typingDelay = Math.min(Math.max(aiDecision.replyText.length * 40, 4000), 10000); // 4s a 10s proporcional ao tamanho
        await new Promise(res => setTimeout(res, typingDelay));

        await this.sock.sendMessage(jid, { text: aiDecision.replyText });
        await this.sock.sendPresenceUpdate('available', jid);

        // Grava a resposta única da IA no banco
        const msgIdAI = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        db.prepare(`
          INSERT INTO chat_messages (id, lead_id, lead_name, phone, sender, message, ai_decision, ai_reasoning, created_at)
          VALUES (?, ?, ?, ?, 'ai', ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(msgIdAI, leadId, leadName, cleanPhone, aiDecision.replyText, aiDecision.decision, aiDecision.reasoning);

        // Se o cliente solicitou contrato explicitamente ou confirmou fechamento, anexa o PDF do Contrato!
        const lowerCombined = combinedText.toLowerCase();
        if (
          lowerCombined.includes('contrato') || 
          lowerCombined.includes('fechado') || 
          lowerCombined.includes('vamos fazer') || 
          lowerCombined.includes('pode gerar') || 
          lowerCombined.includes('manda a proposta')
        ) {
          try {
            console.log(`📄 [Gerando Contrato PDF] Criando contrato sob medida para ${leadName}...`);
            const { ContractService } = await import('./contract.service.js');
            const contractRes = await ContractService.generateContractPDF({
              leadId,
              leadName,
              clientPhone: cleanPhone,
              clientCity: lead?.city || 'Brasil'
            });

            // Envia o documento PDF no WhatsApp
            await this.sock.sendMessage(jid, {
              document: contractRes.pdfBuffer,
              fileName: `Contrato_${leadName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
              mimetype: 'application/pdf',
              caption: '📄 Segue em anexo o Contrato de Prestação de Serviços em PDF para sua conferência e arquivo.'
            });

            console.log(`✅ [Contrato Enviado] PDF do contrato entregue com sucesso para ${leadName}!`);
          } catch (err: any) {
            console.error('Erro ao gerar/enviar anexo de contrato:', err.message);
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao processar resposta consolidada da IA:', err.message);
    }
  }

  /**
   * Envio de mensagem manual ou via robô caçador
   */
  public static async sendTextMessage(phone: string, text: string, leadId?: string, leadName?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.sock || this.connectionStatus !== 'connected') {
      return { success: false, error: 'WhatsApp não está conectado. Escaneie o QR Code no painel.' };
    }

    try {
      let clean = phone.replace(/\D/g, '');
      if (!clean) return { success: false, error: 'Telefone inválido' };

      // Garante formatação com DDI
      if (clean.length === 10 || clean.length === 11) {
        clean = '55' + clean;
      }

      const jid = `${clean}@s.whatsapp.net`;
      await this.sock.sendMessage(jid, { text });

      const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO chat_messages (id, lead_id, lead_name, phone, sender, message, ai_decision, created_at)
        VALUES (?, ?, ?, ?, 'user', ?, 'manual', CURRENT_TIMESTAMP)
      `).run(msgId, leadId || `lead-${clean}`, leadName || 'Lead', clean, text);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Envio de Documento / PDF manual via WhatsApp
   */
  public static async sendDocument(
    phone: string, 
    documentBuffer: Buffer, 
    fileName: string, 
    caption?: string,
    leadId?: string,
    leadName?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.sock || this.connectionStatus !== 'connected') {
      return { success: false, error: 'WhatsApp não está conectado. Escaneie o QR Code no painel.' };
    }

    try {
      let clean = phone.replace(/\D/g, '');
      if (!clean) return { success: false, error: 'Telefone inválido' };

      if (clean.length === 10 || clean.length === 11) {
        clean = '55' + clean;
      }

      const jid = `${clean}@s.whatsapp.net`;
      await this.sock.sendMessage(jid, {
        document: documentBuffer,
        fileName,
        mimetype: 'application/pdf',
        caption: caption || '📄 Documento em anexo'
      });

      const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO chat_messages (id, lead_id, lead_name, phone, sender, message, ai_decision, created_at)
        VALUES (?, ?, ?, ?, 'ai', ?, 'contrato_enviado', CURRENT_TIMESTAMP)
      `).run(msgId, leadId || `lead-${clean}`, leadName || 'Lead', clean, `📄 [Documento Anexo]: ${fileName}`);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Desconectar sessão do WhatsApp
   */
  public static async logout() {
    try {
      if (this.sock) {
        await this.sock.logout();
        this.sock = null;
      }
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
      }
      this.connectionStatus = 'disconnected';
      this.qrCodeDataUrl = null;
      this.connectedPhoneNumber = null;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
