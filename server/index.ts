import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { searchRouter } from './routes/search.routes.js';
import { leadsRouter } from './routes/leads.routes.js';
import { templatesRouter } from './routes/templates.routes.js';
import { autopilotRouter } from './routes/autopilot.routes.js';
import { aiAgentRouter } from './routes/ai-agent.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/search', searchRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/autopilot', autopilotRouter);
app.use('/api/ai-agent', aiAgentRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'B2B Lead Prospector Engine'
  });
});

// Serve frontend if built
const clientDist = path.resolve(process.cwd(), 'client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Servidor de Prospecção B2B rodando em http://localhost:${PORT}`);
  console.log(`📡 Acesso na rede local / celular: http://192.168.1.65:${PORT}`);
  console.log(`📡 Hostname local: http://findlead:${PORT}`);
});
