import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { storageService } from '../services/storageService';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';
const URL_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// export const getSignedUrl = ... (Removed for Option 3)

import sharp from 'sharp';

export const servePublicFile = async (req: Request, res: Response) => {
    try {
        // Handle wildcard match for nested keys
        // If route is /public/*, params[0] usually holds the rest
        const key = req.params[0] || req.params.key;
        const width = req.query.width || req.query.w;

        if (!key) {
            return res.status(400).send('Key is required');
        }

        // Logic to serve file publicly WITHOUT signature
        if (STORAGE_TYPE === 'local') {
            const filePath = path.join(process.cwd(), UPLOAD_DIR, key);
            if (fs.existsSync(filePath)) {
                res.setHeader('Access-Control-Allow-Origin', '*'); // Allow Google/MS to fetch
                res.removeHeader('X-Frame-Options');

                // Check for resizing request
                if (width && !isNaN(Number(width))) {
                    const w = parseInt(width as string);
                    const ext = path.extname(filePath).toLowerCase();
                    if (['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.gif', '.avif'].includes(ext)) {
                        try {
                            const imageBuffer = fs.readFileSync(filePath);
                            const resized = await sharp(imageBuffer)
                                .resize(w, null, { withoutEnlargement: true })
                                .toBuffer();

                            res.setHeader('Content-Type', `image/${ext.replace('.', '')}`);
                            res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache aggressive
                            return res.send(resized);
                        } catch (err) {
                            console.error('Resize error, serving original', err);
                            return res.sendFile(filePath);
                        }
                    }
                }

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
