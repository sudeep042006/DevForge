import axios from 'axios';
import ScanRecord from '../models/ScanRecord.js';

// Controller to handle code analysis logic
export const analyzeCodeSnippet = async (req, res) => {
    try {
        const { codeSnippet, fileName = 'untitled.js', analysisMode = 'api' } = req.body;

        if (!codeSnippet) {
            return res.status(400).json({ error: 'Code snippet is required' });
        }

        console.log(`[Node.js] Received scan request for ${fileName} (mode: ${analysisMode})`);

        // 1. Save initially to MongoDB (Mark as processing)
        const newRecord = await ScanRecord.create({
            fileName,
            codeSnippet,
            // Temporary default values while processing
            riskScore: 0, 
            detectedBugs: [],
            aiSuggestedFixes: []
        });

        // 2. Call Flask Microservice
        // Assuming Flask is running on localhost:8000
        const flaskApiUrl = process.env.FLASK_API_URL || 'http://127.0.0.1:8000';
        
        console.log(`[Node.js] Forwarding payload to Flask Microservice at ${flaskApiUrl}/analyze_code`);
        
        const flaskResponse = await axios.post(`${flaskApiUrl}/analyze_code`, {
            codeSnippet,
            mode: analysisMode  // 'api' or 'local'
        });

        const { riskScore, detectedBugs, aiSuggestedFixes } = flaskResponse.data;

        // 3. Update the MongoDB record with the final ML and LLM results
        newRecord.riskScore = riskScore;
        newRecord.detectedBugs = detectedBugs;
        newRecord.aiSuggestedFixes = aiSuggestedFixes;
        await newRecord.save();

        console.log(`[Node.js] Analysis complete. Saved to database. Returning to client.`);

        // 4. Send everything back to the React UI
        return res.status(200).json({
            message: 'Analysis complete',
            recordId: newRecord._id,
            riskScore,
            detectedBugs,
            aiSuggestedFixes,
            createdAt: newRecord.createdAt
        });

    } catch (error) {
        console.error('[Node.js] Error during code analysis:', error.message);
        return res.status(500).json({ 
            error: 'Server Error during analysis', 
            details: error.response?.data || error.message 
        });
    }
};

export const getScanHistory = async (req, res) => {
    try {
        const history = await ScanRecord.find().sort({ createdAt: -1 }).limit(50);
        return res.status(200).json(history);
    } catch (error) {
        console.error('[Node.js] Error fetching history:', error.message);
        return res.status(500).json({ error: 'Failed to fetch scan history' });
    }
};
