import { Router } from 'express';
import { AutopilotController } from '../controllers/autopilot.controller.js';

export const autopilotRouter = Router();

autopilotRouter.get('/status', AutopilotController.getStatus);
autopilotRouter.post('/trigger', AutopilotController.triggerHunt);
autopilotRouter.post('/market', AutopilotController.setMarket);
autopilotRouter.post('/settings', AutopilotController.updateSettings);
