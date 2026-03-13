import express from 'express';
import { executeCommand } from '../controllers/terminalController.js';

const router = express.Router();

// Execute a shell command
router.post('/execute', executeCommand);

export default router;
