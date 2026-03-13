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

export default router;
