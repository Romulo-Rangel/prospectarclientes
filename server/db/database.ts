import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'prospects.db');
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    phone TEXT,
    formatted_phone TEXT,
    website TEXT,
    has_website INTEGER DEFAULT 0,
    website_status TEXT DEFAULT 'unknown',
    website_status_code INTEGER,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    maps_url TEXT,
    lead_score TEXT DEFAULT 'Média',
    opportunity_tags TEXT,
    status TEXT DEFAULT 'novo',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    channel TEXT NOT NULL, -- 'whatsapp', 'email', 'instagram', 'call'
    target_country TEXT DEFAULT 'ALL', -- 'ALL', 'BR', 'PT', etc.
    subject TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS searches (
    id TEXT PRIMARY KEY,
    niche TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    total_found INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    lead_name TEXT,
    phone TEXT NOT NULL,
    sender TEXT NOT NULL, -- 'lead', 'ai', 'user'
    message TEXT NOT NULL,
    ai_decision TEXT, -- 'interessado_fechar', 'negociando', 'duvida', 'recusou', 'outro'
    ai_reasoning TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ai_agent_settings (
    id TEXT PRIMARY KEY,
    is_auto_reply_enabled INTEGER DEFAULT 1,
    is_auto_hunter_enabled INTEGER DEFAULT 1,
    sdr_persona TEXT,
    price_range TEXT DEFAULT 'R$ 900 a R$ 3.500',
    delay_min_seconds INTEGER DEFAULT 10,
    delay_max_seconds INTEGER DEFAULT 25,
    work_start_time TEXT DEFAULT '09:00',
    work_end_time TEXT DEFAULT '18:00',
    lunch_start_time TEXT DEFAULT '12:00',
    lunch_end_time TEXT DEFAULT '13:00',
    work_days TEXT DEFAULT '1,2,3,4,5',
    respect_business_hours INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    lead_name TEXT NOT NULL,
    client_phone TEXT,
    service_title TEXT DEFAULT 'Desenvolvimento de Website & Sistema Web',
    total_value TEXT DEFAULT 'R$ 1.200,00',
    payment_terms TEXT DEFAULT '50% de entrada no início + 50% na entrega e aprovação',
    delivery_days INTEGER DEFAULT 10,
    pdf_path TEXT,
    status TEXT DEFAULT 'enviado', -- 'rascunho', 'enviado', 'assinado'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration for existing databases
try {
  db.exec(`
    ALTER TABLE ai_agent_settings ADD COLUMN work_start_time TEXT DEFAULT '09:00';
  `);
} catch {}
try {
  db.exec(`
    ALTER TABLE ai_agent_settings ADD COLUMN work_end_time TEXT DEFAULT '18:00';
  `);
} catch {}
try {
  db.exec(`
    ALTER TABLE ai_agent_settings ADD COLUMN lunch_start_time TEXT DEFAULT '12:00';
  `);
} catch {}
try {
  db.exec(`
    ALTER TABLE ai_agent_settings ADD COLUMN lunch_end_time TEXT DEFAULT '13:00';
  `);
} catch {}
try {
  db.exec(`
    ALTER TABLE ai_agent_settings ADD COLUMN work_days TEXT DEFAULT '1,2,3,4,5';
  `);
} catch {}
try {
  db.exec(`
    ALTER TABLE ai_agent_settings ADD COLUMN respect_business_hours INTEGER DEFAULT 1;
  `);
} catch {}

// Insert default AI settings if not exist
const aiSettingsCount = db.prepare('SELECT count(*) as count FROM ai_agent_settings').get() as { count: number };
if (aiSettingsCount.count === 0) {
  db.prepare(`
    INSERT INTO ai_agent_settings (id, is_auto_reply_enabled, is_auto_hunter_enabled, sdr_persona, price_range, work_start_time, work_end_time, lunch_start_time, lunch_end_time, work_days, respect_business_hours)
    VALUES ('default', 1, 1, 'Consultor Comercial Especialista em Soluções Web & Automação do Rômulo', 'R$ 900 a R$ 3.500', '09:00', '18:00', '12:00', '13:00', '1,2,3,4,5', 1)
  `).run();
}

// Seed default templates if none exist
const count = db.prepare('SELECT count(*) as count FROM templates').get() as { count: number };
if (count.count === 0) {
  const insertTemplate = db.prepare(`
    INSERT INTO templates (id, name, channel, target_country, subject, content)
    VALUES (@id, @name, @channel, @target_country, @subject, @content)
  `);

  const defaultTemplates = [
    {
      id: 'tpl-wa-br-sem-site',
      name: 'WhatsApp (Brasil) - Sem Website',
      channel: 'whatsapp',
      target_country: 'BR',
      subject: '',
      content: `Olá, tudo bem? Me chamo {{meu_nome}} e trabalho com criação de sites e sistemas web para empresas em {{cidade}}.

Notei que a *{{empresa}}* tem uma excelente reputação em {{nicho}}, mas percebi que vocês ainda não possuem um site próprio ou sistema de agendamento/catálogo online.

Hoje em dia, a maioria dos clientes pesquisa no Google antes de comprar. Um site profissional com botão direto para WhatsApp aumenta muito a credibilidade e as vendas.

Posso te apresentar uma proposta rápida sem compromisso para criarmos a página da *{{empresa}}*?

Se preferir, pode me chamar direto por aqui ou no meu WhatsApp: {{meu_telefone}}`
    },
    {
      id: 'tpl-wa-pt-sem-site',
      name: 'WhatsApp (Portugal) - Sem Sítio Web',
      channel: 'whatsapp',
      target_country: 'PT',
      subject: '',
      content: `Olá! Espero que se encontre bem. O meu nome é {{meu_nome}} e sou especialista em desenvolvimento de websites e plataformas digitais.

Estive a pesquisar empresas de referência em {{nicho}} na zona de {{cidade}} e encontrei a *{{empresa}}*. Reparei que ainda não dispõem de um website profissional ou sistema de reservas online.

Atualmente, ter um sítio web rápido, moderno e adaptado aos telemóveis faz toda a diferença para captar novos clientes e transmitir confiança.

Teria interesse em conhecer uma demonstração personalizada e sem qualquer compromisso para a *{{empresa}}*?

Contacto direto WhatsApp: {{meu_telefone}}`
    },
    {
      id: 'tpl-wa-site-offline',
      name: 'WhatsApp - Site Indisponível / Erro',
      channel: 'whatsapp',
      target_country: 'ALL',
      subject: '',
      content: `Olá! Sou desenvolvedor web e encontrei a *{{empresa}}* ao pesquisar por {{nicho}} em {{cidade}}.

Fui aceder ao vosso website ({{website}}), mas reparei que está com erro ou fora do ar no momento.

Vocês estão cientes dessa instabilidade? Se precisarem de ajuda para recuperar, modernizar ou hospedar em uma estrutura rápida e segura, fico à total disposição!

Meu WhatsApp direto: {{meu_telefone}}`
    },
    {
      id: 'tpl-wa-us-no-website',
      name: 'WhatsApp (USA / English) - No Website',
      channel: 'whatsapp',
      target_country: 'US',
      subject: '',
      content: `Hello! Hope you're doing well. My name is {{meu_nome}}, and I build modern websites and web booking systems for local businesses in {{cidade}}.

I came across *{{empresa}}* while looking up top {{nicho}} in {{cidade}}, and noticed you don't have an official website linked on Google Maps yet.

A sleek, mobile-friendly website makes a huge difference in attracting new customers. Would you be open to seeing a free, quick mock-up for *{{empresa}}*?

You can reply directly here or on WhatsApp: {{meu_telefone}}
Best regards!`
    },
    {
      id: 'tpl-wa-es-sin-sitio',
      name: 'WhatsApp (Espanha / Español) - Sin Sitio Web',
      channel: 'whatsapp',
      target_country: 'ES',
      subject: '',
      content: `¡Hola! Espero que esté teniendo un buen día. Mi nombre es {{meu_nome}} y me especializo en diseño web y sistemas digitales para empresas en {{cidade}}.

Estuve revisando negocios destacados de {{nicho}} en {{cidade}} y encontré a *{{empresa}}*. Noté que todavía no disponen de una página web oficial o catálogo online.

Tener un sitio web rápido y moderno aumenta notablemente la confianza y las ventas locales. ¿Le gustaría recibir una demostración rápida y sin ningún compromiso para *{{empresa}}*?

Contacto directo por WhatsApp: {{meu_telefone}}`
    },
    {
      id: 'tpl-email-proposta',
      name: 'E-mail - Proposta Consultiva B2B',
      channel: 'email',
      target_country: 'ALL',
      subject: 'Oportunidade de expansão digital para {{empresa}} em {{cidade}}',
      content: `Olá equipa da {{empresa}},

Espero que este e-mail os encontre bem.

Meu nome é {{meu_nome}} e sou desenvolvedor de software e sistemas web. Ao fazer um levantamento de empresas do setor de {{nicho}} em {{cidade}}, identifiquei grande potencial de crescimento para a {{empresa}} através de soluções digitais modernas.

Principais benefícios de um sistema web / portal sob medida:
• Atração de clientes qualificados 24h por dia;
• Agendamento ou pedidos automatizados direto no WhatsApp/Painel;
• Posicionamento de destaque nos motores de busca (Google).

Gostaria de agendar uma breve conversa de 10 minutos (sem qualquer compromisso)?

Atenciosamente,
{{meu_nome}}
WhatsApp: {{meu_telefone}}
Desenvolvedor de Software`
    }
  ];

  for (const tpl of defaultTemplates) {
    insertTemplate.run(tpl);
  }
}
