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

  /**
   * Processa a mensagem recebida com a IA e responde
   */
  private static async handleIncomingMessage(jid: string, rawPhone: string, text: string) {
    try {
      // 1. Localiza lead na base de dados
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const lead = db.prepare(`
        SELECT * FROM leads 
        WHERE formatted_phone LIKE '%' || ? || '%' 
           OR phone LIKE '%' || ? || '%'
        LIMIT 1
      `).get(cleanPhone, cleanPhone) as any;

      const leadId = lead ? lead.id : `external-${cleanPhone}`;
      const leadName = lead ? lead.name : 'Cliente';

      // 2. Salva a mensagem recebida no histórico
      const msgIdLead = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO chat_messages (id, lead_id, lead_name, phone, sender, message, created_at)
        VALUES (?, ?, ?, ?, 'lead', ?, CURRENT_TIMESTAMP)
      `).run(msgIdLead, leadId, leadName, cleanPhone, text);

      // 3. Verifica se a resposta automática da IA está ativa
      if (!this.isAutoReplyEnabled()) {
        console.log('🤖 [IA Comercial] Auto-resposta desativada nas configurações. Mensagem apenas gravada.');
        return;
      }

      // 4. Carrega histórico recente da conversa
      const historyRows = db.prepare(`
        SELECT sender, message, created_at FROM chat_messages 
        WHERE lead_id = ? OR phone = ?
        ORDER BY created_at ASC
        LIMIT 10
      `).all(leadId, cleanPhone) as any[];

      // 5. Cérebro da IA formula a decisão e resposta
      const aiDecision = AIBrainService.processIncomingMessage({
        leadId,
        leadName,
        phone: cleanPhone,
        incomingText: text,
        conversationHistory: historyRows,
        senderName: 'Rômulo',
        senderPhone: '(27) 98817-2973'
      });

      console.log(`🧠 [IA Decisão] Decisão: ${aiDecision.decision.toUpperCase()} | Score: ${aiDecision.confidenceScore}%`);

      // 6. Atualiza status do Lead no CRM se necessário
      if (lead) {
        db.prepare(`
          UPDATE leads 
          SET status = ?, 
              notes = COALESCE(notes, '') || '\n🤖 [IA]: ' || ?, 
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(aiDecision.newStatusForCRM, aiDecision.reasoning, lead.id);
      }

      // 7. Simula digitação humana antes de enviar
      if (this.sock && this.connectionStatus === 'connected' && aiDecision.replyText) {
        // Envia presença digitando
        await this.sock.sendPresenceUpdate('composing', jid);

        const delay = Math.floor(Math.random() * (12000 - 6000 + 1) + 6000); // 6s a 12s
        await new Promise(res => setTimeout(res, delay));

        // Envia mensagem
        await this.sock.sendMessage(jid, { text: aiDecision.replyText });
        await this.sock.sendPresenceUpdate('available', jid);

        // Grava mensagem da IA no banco
        const msgIdAI = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        db.prepare(`
          INSERT INTO chat_messages (id, lead_id, lead_name, phone, sender, message, ai_decision, ai_reasoning, created_at)
          VALUES (?, ?, ?, ?, 'ai', ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(msgIdAI, leadId, leadName, cleanPhone, aiDecision.replyText, aiDecision.decision, aiDecision.reasoning);

        console.log(`📤 [IA Respondido] Mensagem enviada para ${leadName} (${cleanPhone})!`);
      }

    } catch (err: any) {
      console.error('Erro ao processar mensagem com IA:', err.message);
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
