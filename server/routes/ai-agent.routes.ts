import { Router } from 'express';
import { AIAgentController } from '../controllers/ai-agent.controller.js';

export const aiAgentRouter = Router();

aiAgentRouter.get('/status', AIAgentController.getStatus);
aiAgentRouter.post('/connect', AIAgentController.connect);
aiAgentRouter.post('/disconnect', AIAgentController.disconnect);
aiAgentRouter.post('/toggle-auto-reply', AIAgentController.toggleAutoReply);
aiAgentRouter.get('/conversations', AIAgentController.getConversations);
aiAgentRouter.get('/conversations/:leadId', AIAgentController.getConversationThread);
aiAgentRouter.post('/send-message', AIAgentController.sendMessage);
aiAgentRouter.get('/business-hours', AIAgentController.getBusinessHours);
aiAgentRouter.post('/business-hours', AIAgentController.saveBusinessHours);
