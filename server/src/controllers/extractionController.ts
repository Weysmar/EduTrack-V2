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
    // Only this dedicated directory is ever deleted. Never derive the cleanup target from a path built
    // with the client-supplied filename: a name like ".." resolved to the parent directory, and the
    // recursive cleanup then deleted os.tmpdir() or "/".
    let tempDir: string | null = null;

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        // Save uploaded file temporarily under a fixed name: only the extension is needed (it drives
        // the extraction method), and it is restricted to a plain alphanumeric suffix
        // deepcode ignore NoRateLimitingForExpensiveWebOperation: multer handles size limits before buffer is populated
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'upload-'));
        const ext = path.extname(sanitizeFilename(req.file.originalname)).toLowerCase();
        const safeExt = /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : '';
        const tempFilePath = path.join(tempDir, `input${safeExt}`);
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
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true }).catch(console.error);
        }
    }
};
