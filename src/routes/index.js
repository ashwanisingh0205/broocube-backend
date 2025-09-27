import express from 'express';
import { exampleController } from '../controllers/exampleController';

const router = express.Router();

// Define your routes here
router.get('/example', exampleController.getExample);
router.post('/example', exampleController.createExample);

// Export the router
export default router;