import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

// Load environment variables
dotenv.config();

// Connect to the database
connectDB();

const app = express();

// Middleware
app.use(cors()); // Allows your React frontend to talk to this backend
app.use(express.json()); // Allows parsing of incoming JSON payloads

// Basic test route to ensure server is running
app.get('/', (req, res) => {
    res.send('AI Bug Detector API is running...');
});

// We will mount your actual routes here later
import scanRoutes from './routes/scanRoutes.js';
import analyzeRoutes from './routes/analyze.js';
import coreRoutes from './routes/coreRoutes.js';
import historyRoutes from './routes/history.js';
import terminalRoutes from './routes/terminalRoutes.js';

app.use('/api/scans', scanRoutes);
app.use('/api/analyze', analyzeRoutes); // Mount file upload endpoints
app.use('/api/core', coreRoutes); // Mount generic CRUD endpoints
app.use('/api/history', historyRoutes); // Repo analysis history
app.use('/api/terminal', terminalRoutes); // Terminal command execution

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});