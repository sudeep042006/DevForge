import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { analyzeCodeSnippet } from '../controllers/scanController.js';
import RepoHistory from '../models/RepoHistory.js';

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

        // 5. Save to MongoDB history (non-blocking - don't fail the response if this fails)
        try {
            await RepoHistory.create({
                repoUrl,
                owner,
                repoName,
                aiSummary: aiSummary || {},
                architectureDiagram,
                filesCount: fileTree.length,
                status: 'success'
            });
            console.log('[Node.js] Repo analysis saved to history.');
        } catch (dbErr) {
            console.error('[Node.js] Failed to save to RepoHistory:', dbErr.message);
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

// Endpoint to handle deep bug scanning for an entire cloned repository (full context, single Gemini call)
router.post('/repo-bugs', async (req, res) => {
    try {
        const { localPath, repoUrl } = req.body;
        if (!localPath) {
            return res.status(400).json({ error: 'Local repository path is required.' });
        }

        const { getSourceFiles } = await import('../services/repoService.js');
        const ScanRecord = (await import('../models/ScanRecord.js')).default;
        
        // 1. Gather ALL useful source files (more context = better AI suggestions)
        const filesToScan = getSourceFiles(localPath, 15);
        
        if (filesToScan.length === 0) {
            return res.status(404).json({ error: 'No scannable source files found in repository.' });
        }

        console.log(`[Node.js] Building full-repo payload from ${filesToScan.length} files...`);

        // 2. Concatenate ALL files into ONE big context string (up to 30k chars handled by Flask)
        const repoCode = filesToScan.map(f => 
            `// ===== FILE: ${f.fileName} =====\n${f.code}`
        ).join('\n\n');

        // 3. Single call to the new AI endpoint — full context, one response
        console.log('[Node.js] Sending full-repo context to /analyze_full_repo...');
        const flaskResponse = await fetch('http://127.0.0.1:8000/analyze_full_repo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoCode, repoUrl })
        });

        if (!flaskResponse.ok) {
            const errText = await flaskResponse.text();
            throw new Error(`Flask error: ${errText}`);
        }

        const result = await flaskResponse.json();

        const allBugs = result.detectedBugs || [];
        const allFixes = result.aiSuggestedFixes || [];
        // Estimate risk: 10% per bug found, capped at 100%
        const riskScore = Math.min(allBugs.length * 10, 100);

        // 4. Save to MongoDB ScanRecord
        const newRecord = await ScanRecord.create({
            fileName: repoUrl || localPath,
            codeSnippet: `Full-repo scan of ${filesToScan.length} files.`,
            riskScore,
            detectedBugs: allBugs,
            aiSuggestedFixes: allFixes
        });

        console.log('[Node.js] Full-repo scan complete. Saved to database.');
        return res.status(200).json({
            message: 'Repository Bug Scan Complete',
            recordId: newRecord._id,
            riskScore,
            detectedBugs: allBugs,
            aiSuggestedFixes: allFixes,
            filesAnalyzed: filesToScan.length,
            aiSummary: {
                projectExplanation: result.projectExplanation,
                mainModules: result.mainModules
            }
        });

    } catch (error) {
        console.error('[Node.js] Error handling repo bug scan:', error);
        return res.status(500).json({ error: 'Failed to scan repository for bugs.' });
    }
});

export default router;
