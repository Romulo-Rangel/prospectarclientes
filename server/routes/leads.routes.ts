import { Router } from 'express';
import { LeadsController } from '../controllers/leads.controller.js';

export const leadsRouter = Router();

leadsRouter.get('/', LeadsController.list);
leadsRouter.get('/stats', LeadsController.getStats);
leadsRouter.patch('/:id/status', LeadsController.updateStatus);
leadsRouter.patch('/:id/notes', LeadsController.updateNotes);
leadsRouter.delete('/batch/clear', LeadsController.clearAll);
leadsRouter.delete('/:id', LeadsController.deleteOne);
leadsRouter.get('/export/csv', LeadsController.exportCsv);
