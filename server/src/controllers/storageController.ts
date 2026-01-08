import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { storageService } from '../services/storageService';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';
const URL_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export const getSignedUrl = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        if (!key) return res.status(400).json({ message: 'Key is required' });

        // 1 hour expiration
        const expires = Date.now() + 3600 * 1000;
        const signature = crypto.createHmac('sha256', URL_SECRET)
            .update(`${key}:${expires}`)
            .digest('hex');

        // Construct public URL
        // We use relative URL, frontend will append API_URL
        const url = `/storage/public/${key}?expires=${expires}&signature=${signature}`;

        res.json({ url, expires });
    } catch (error) {
        res.status(500).json({ message: 'Error generating signed URL' });
    }
};

export const servePublicFile = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { expires, signature } = req.query;

        if (!key || !expires || !signature) {
            return res.status(400).send('Missing parameters');
        }

        if (Number(expires) < Date.now()) {
            return res.status(403).send('Link expired');
        }

        const expectedSignature = crypto.createHmac('sha256', URL_SECRET)
            .update(`${key}:${expires}`)
            .digest('hex');

        if (signature !== expectedSignature) {
            return res.status(403).send('Invalid signature');
        }

        // Serve File logic (duplicate of proxyFile mostly)
        if (STORAGE_TYPE === 'local') {
            const filePath = path.join(process.cwd(), UPLOAD_DIR, key);
            if (fs.existsSync(filePath)) {
                res.setHeader('Access-Control-Allow-Origin', '*'); // Allow Google/MS to fetch
                res.removeHeader('X-Frame-Options');
                return res.sendFile(filePath);
            } else {
                return res.status(404).send('File not found');
            }
        } else {
            const url = await storageService.getFileUrl(key);
            return res.redirect(url);
        }

    } catch (error) {
        console.error('Public Access Error:', error);
        res.status(500).send('Error serving file');
    }
};

export const proxyFile = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;

        if (!key) {
            return res.status(400).json({ message: 'Key is required' });
        }

        if (STORAGE_TYPE === 'local') {
            const filePath = path.join(process.cwd(), UPLOAD_DIR, key);
            if (fs.existsSync(filePath)) {
                // Explicitly allow framing for PDF viewer
                res.removeHeader('X-Frame-Options');
                res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");
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
