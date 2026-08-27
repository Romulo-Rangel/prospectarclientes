import { Router } from 'express';
import { SearchController } from '../controllers/search.controller.js';

export const searchRouter = Router();

searchRouter.get('/stream', SearchController.stream);
searchRouter.post('/', SearchController.execute);
searchRouter.get('/history', SearchController.getHistory);
