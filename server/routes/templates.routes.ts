import { Router } from 'express';
import { TemplatesController } from '../controllers/templates.controller.js';

export const templatesRouter = Router();

templatesRouter.get('/', TemplatesController.list);
templatesRouter.post('/', TemplatesController.create);
templatesRouter.put('/:id', TemplatesController.update);
templatesRouter.delete('/:id', TemplatesController.deleteOne);
templatesRouter.post('/render', TemplatesController.render);
