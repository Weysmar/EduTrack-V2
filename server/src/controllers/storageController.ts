import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { storageService } from '../services/storageService';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';

export const proxyFile = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;

        if (!key) {
            return res.status(400).json({ message: 'Key is required' });
        }

        if (STORAGE_TYPE === 'local') {
            const filePath = path.join(process.cwd(), UPLOAD_DIR, key);
            if (fs.existsSync(filePath)) {
                return res.sendFile(filePath);
            } else {
                return res.status(404).json({ message: 'File not found' });
            }
        } else {
            // S3 Proxy - Redirect to signed URL for better performance/simplicity
            // Or fetch and pipe if stricly needing proxy (rare for simple version)
            const url = await storageService.getFileUrl(key);
            return res.redirect(url);
        }
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ message: 'Error retrieving file' });
    }
};
