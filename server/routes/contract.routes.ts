import { Router } from 'express';
import { ContractController } from '../controllers/contract.controller.js';

export const contractRouter = Router();

contractRouter.get('/template', ContractController.getTemplate);
contractRouter.post('/template', ContractController.saveTemplate);
contractRouter.get('/list', ContractController.getContractsList);
contractRouter.post('/generate/:leadId', ContractController.generateContract);
contractRouter.get('/download/:contractId', ContractController.downloadContractPDF);
contractRouter.post('/send/:leadId', ContractController.sendContractToLead);
