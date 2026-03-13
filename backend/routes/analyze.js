import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { analyzeCodeSnippet } from '../controllers/scanController.js';

const router = express.Router();

// Configure Multer for local disk storage temporarily to read file contents
const upload = multer({ dest: 'uploads/' });

// Endpoint to handle file uploads.
// The frontend will send a multipart/form-data request with the file under the key 'codeFile'.
router.post('/upload', upload.single('codeFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded. Please attach a file to "codeFile".' });
        }

        // 1. Read the contents of the uploaded file
        const codeSnippet = fs.readFileSync(req.file.path, 'utf8');
        const fileName = req.file.originalname;

        // 2. Clean up the temporary file created by Multer
        fs.unlinkSync(req.file.path);

        // 3. We can either return the file content to the frontend to put it in the code editor,
        // or we can pass it directly to the analysis controller.
        // Let's return the content so the frontend code editor can display it,
        // and the user can review it before clicking "Analyze".
        return res.status(200).json({
            message: 'File successfully loaded',
            fileName: fileName,
            codeSnippet: codeSnippet
        });

    } catch (error) {
        console.error('[Node.js] Error handling file upload:', error);
        return res.status(500).json({ error: 'Failed to process the uploaded file.' });
    }
});

// Endpoint to handle GitHub repository scanning
router.post('/repo', async (req, res) => {
    try {
        const { repoUrl } = req.body;
        if (!repoUrl) {
            return res.status(400).json({ error: 'Repository URL is required.' });
        }

        // Dynamically import repoService to avoid circular/init issues if any
        const { cloneRepo, getFileTree } = await import('../services/repoService.js');
        
        // 1. Clone Repo
        const { localPath, owner, repoName } = await cloneRepo(repoUrl);
        
        // 2. Map File Tree
        const fileTree = getFileTree(localPath);
        
        // Try to read README if it exists
        let readmeContent = '';
        try {
            const fsLib = await import('fs');
            const pathLib = await import('path');
            const readmePath = pathLib.join(localPath, 'README.md');
            if (fsLib.existsSync(readmePath)) {
                readmeContent = fsLib.readFileSync(readmePath, 'utf8').substring(0, 5000); // cap length
            }
        } catch (e) {
            console.log("No README found or could not read");
        }

        // 3. Call AIML Engine for Repo Summary
        let aiSummary = {
            projectExplanation: "Could not generate summary.",
            mainModules: "Unknown"
        };
        
        try {
            const aiResponse = await fetch('http://127.0.0.1:8000/analyze_repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repoUrl,
                    fileTree: fileTree.slice(0, 100), // pass a subset of files to avoid huge payloads
                    readmeContent
                })
            });
            if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                aiSummary = aiData.summary;
            }
        } catch (error) {
            console.error('[Node.js] Error calling AIML engine for summary:', error);
        }

        // 4. Call AIML Engine for Architecture Diagram
        let architectureDiagram = "graph TD\n    A[Processing architecture...]";
        try {
            const archResponse = await fetch('http://127.0.0.1:8000/analyze_architecture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ localPath })
            });
            if (archResponse.ok) {
                const archData = await archResponse.json();
                architectureDiagram = archData.mermaidGraph;
            }
        } catch (error) {
            console.error('[Node.js] Error calling AIML engine for architecture:', error);
        }

        return res.status(200).json({
            message: 'Repository cloned and analyzed',
            repoUrl,
            owner,
            repoName,
            fileTree,
            aiSummary,
            architectureDiagram
        });

    } catch (error) {
        console.error('[Node.js] Error handling repo clone:', error);
        return res.status(500).json({ error: 'Failed to process the repository.' });
    }
});

// Endpoint to handle deep bug scanning for an entire cloned repository
router.post('/repo-bugs', async (req, res) => {
    try {
        const { localPath, repoUrl } = req.body;
        if (!localPath) {
            return res.status(400).json({ error: 'Local repository path is required.' });
        }

        const { getSourceFiles } = await import('../services/repoService.js');
        const ScanRecord = (await import('../models/ScanRecord.js')).default;
        
        // 1. Gather Source Files (Cap at 5 to prevent massive LLM payloads/timeouts)
        const filesToScan = getSourceFiles(localPath, 5);
        
        if (filesToScan.length === 0) {
            return res.status(404).json({ error: 'No scannable source files found in repository.' });
        }

        console.log(`[Node.js] Scanning ${filesToScan.length} files from ${localPath}`);

        let totalRiskScore = 0;
        let allBugs = [];
        let allFixes = [];

        // 2. Iterate each file and ask the AIML Engine to find bugs
        // In a real app we might do `Promise.all` but to avoid rate limits, we'll process sequentially
        for (const fileObj of filesToScan) {
            console.log(`[Node.js] Forwarding ${fileObj.fileName} to Flask Microservice...`);
            
            try {
                const flaskResponse = await fetch('http://127.0.0.1:8000/analyze_code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ codeSnippet: fileObj.code })
                });

                if (flaskResponse.ok) {
                    const flaskData = await flaskResponse.json();
                    
                    totalRiskScore += flaskData.riskScore;
                    
                    // Attach the filename to each bug so the frontend knows where it came from
                    const mappedBugs = (flaskData.detectedBugs || []).map(bug => ({
                        ...bug,
                        description: `[${fileObj.fileName}] ${bug.description}`
                    }));
                    
                    allBugs = [...allBugs, ...mappedBugs];
                    allFixes = [...allFixes, ...(flaskData.aiSuggestedFixes || [])];
                }
            } catch (err) {
                console.error(`[Node.js] Error analyzing ${fileObj.fileName}:`, err.message);
            }
        }

        // 3. Average the risk score
        const averageRiskScore = filesToScan.length > 0 ? (totalRiskScore / filesToScan.length) : 0;

        // 4. Save to MongoDB
        const newRecord = await ScanRecord.create({
            fileName: repoUrl || localPath, // Use the repo URL or path to identify this scan
            codeSnippet: `Deep Scan of ${filesToScan.length} files.`,
            riskScore: averageRiskScore,
            detectedBugs: allBugs,
            aiSuggestedFixes: allFixes
        });

        console.log(`[Node.js] Repository Deep Scan complete. Saved to database. Returning to client.`);

        return res.status(200).json({
            message: 'Repository Bug Scan Complete',
            recordId: newRecord._id,
            riskScore: averageRiskScore,
            detectedBugs: allBugs,
            aiSuggestedFixes: allFixes,
            filesAnalyzed: filesToScan.length
        });

    } catch (error) {
        console.error('[Node.js] Error handling repo bug scan:', error);
        return res.status(500).json({ error: 'Failed to scan repository for bugs.' });
    }
});

export default router;
