import { Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { extractionService } from '../services/extractionService';
import { sanitizeFilename } from '../utils/sanitizePath';

interface AuthRequest extends Request {
    user?: { id: string };
    file?: Express.Multer.File;
}

// POST /api/extract
export const extractText = async (req: AuthRequest, res: Response) => {
    let tempFilePath: string | null = null;

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        // Save uploaded file temporarily
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'upload-'));
        const safeName = sanitizeFilename(req.file.originalname);
        tempFilePath = path.join(tempDir, safeName);
        await fs.writeFile(tempFilePath, req.file.buffer);

        // Extract text
        const result = await extractionService.extractText(tempFilePath);

        res.json(result);
    } catch (error) {
        console.error('Extraction error:', error);
        res.status(500).json({
            message: 'Text extraction failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    } finally {
        // Cleanup
        if (tempFilePath) {
            const tempDir = path.dirname(tempFilePath);
            await fs.rm(tempDir, { recursive: true, force: true }).catch(console.error);
        }
    }
};
