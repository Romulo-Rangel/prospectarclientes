# 🚀 LeadHunter Pro - Prospecção B2B & Automação WhatsApp

Sistema completo em **Node.js, TypeScript e React** para prospecção qualificada de clientes B2B (Google Maps, OpenStreetMap e fontes públicas), auditoria automática de presença digital (detecção de empresas sem site, sites fora do ar ou inseguros) e disparador de mensagens personalizado no WhatsApp (Brasil, Portugal, EUA e Europa).

---

## ✨ Funcionalidades Principais

- 🔍 **Radar de Busca Multi-País**: Prospecção em tempo real com filtros estritos de nicho (gastronomia, odontologia, estética, oficinas, contabilidade, etc.) e exclusão de órgãos públicos.
- 📱 **Captura de WhatsApp Real**: Extração de telefones/celulares com validação de formato internacional (DDI/DDD).
- 💡 **Diagnóstico Automático de Oportunidades**: Identifica empresas 100% sem site, domínios expirados ou sites com falhas (erros 404/500/timeout).
- 🤖 **Robô Caçador Autônomo (10/dia)**: Rotina diária de prospecção nos mercados Americano (EUA - $), Português (PT - €), Europeu e Brasileiro.
- 📲 **Integração WhatsApp Nativo & Web**: Envio com 1 clique direto no aplicativo móvel do celular ou WhatsApp Web no desktop.
- 📊 **CRM Kanban & Métricas**: Funil de vendas (Novo &rarr; Contatado &rarr; Em Negociação &rarr; Convertido) com exportação CSV.
- 📱 **Interface 100% Responsiva**: Acesso direto pelo navegador do celular na rede local (`http://192.168.1.65:3001`).

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js, TypeScript, Express, Better-SQLite3, Puppeteer, Cheerio, Axios.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v4, Lucide React, Canvas Confetti.

---

## 🚀 Como Executar

### 1. Clonar o repositório e instalar dependências:
```bash
git clone https://github.com/Romulo-Rangel/prospectarclientes.git
cd prospectarclientes
npm install
npm --prefix client install
```

### 2. Compilar o frontend:
```bash
npm --prefix client run build
```

### 3. Iniciar o servidor:
```bash
npm run dev:server
```

Acesse no navegador:
- **Computador**: [http://localhost:3001](http://localhost:3001)
- **Celular (mesmo Wi-Fi)**: `http://<SEU_IP_LOCAL>:3001`
