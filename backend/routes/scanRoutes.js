import express from 'express';
import { analyzeCodeSnippet, getScanHistory } from '../controllers/scanController.js';

const router = express.Router();

// Route to submit a new code snippet for ML analysis
router.post('/analyze', analyzeCodeSnippet);

// Route to fetch previous scan records
router.get('/history', getScanHistory);

export default router;
