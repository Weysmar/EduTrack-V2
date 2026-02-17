import fs from 'fs';
import path from 'path';
import { sanitizeFilename, sanitizeKey, isPathWithinBase } from '../utils/sanitizePath';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// S3 Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    },
    endpoint: process.env.AWS_ENDPOINT // For MinIO
});

export const storageService = {

    async uploadFile(file: Express.Multer.File): Promise<{ url: string; key: string }> {
        const safeName = sanitizeFilename(file.originalname);
        const key = `${Date.now()}-${safeName}`;

        if (STORAGE_TYPE === 's3') {
            const command = new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype
            });

            await s3Client.send(command);

            // Generate URL (Signed or Public depending on config)
            // For this implementation, we assume signed URLs or public bucket
            const url = await getSignedUrl(s3Client, new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key
            }), { expiresIn: 3600 * 24 * 7 }); // 7 days

            return { url, key };
        } else {
            // Local Storage
            const targetPath = path.join(process.cwd(), UPLOAD_DIR, key);

            // Ensure dir exists
            if (!fs.existsSync(path.dirname(targetPath))) {
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            }

            fs.writeFileSync(targetPath, file.buffer);

            // Return relative URL for static serving
            const url = `/uploads/${key}`;
            return { url, key };
        }
    },

    async deleteFile(key: string): Promise<void> {
        if (!key) return;

        if (STORAGE_TYPE === 's3') {
            await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key
            }));
        } else {
            const safeKey = sanitizeKey(key);
            const baseDir = path.join(process.cwd(), UPLOAD_DIR);
            const targetPath = path.join(baseDir, safeKey);
            if (isPathWithinBase(targetPath, baseDir) && fs.existsSync(targetPath)) {
                fs.unlinkSync(targetPath);
            }
        }
    },

    async getFileUrl(key: string): Promise<string> {
        if (STORAGE_TYPE === 's3') {
            return getSignedUrl(s3Client, new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key
            }), { expiresIn: 3600 });
        } else {
            return `/uploads/${key}`;
        }
    },

    async generateThumbnail(file: Express.Multer.File): Promise<Buffer | null> {
        // Only process images
        if (!file.mimetype.startsWith('image/')) return null;

        try {
            const sharp = require('sharp'); // Dynamic import to avoid crash if not installed
            return await sharp(file.buffer)
                .resize(400, 300, { fit: 'cover', position: 'center' })
                .webp({ quality: 80 })
                .toBuffer();
        } catch (error) {
            console.error('Thumbnail generation failed:', error);
            return null;
        }
    },

    async getFileContent(key: string): Promise<Buffer | null> {
        if (!key) return null;

        try {
            if (STORAGE_TYPE === 's3') {
                const command = new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key
                });
                const response = await s3Client.send(command);
                if (response.Body) {
                    // Convert stream to buffer
                    const streamToBuffer = (stream: any) =>
                        new Promise<Buffer>((resolve, reject) => {
                            const chunks: any[] = [];
                            stream.on("data", (chunk: any) => chunks.push(chunk));
                            stream.on("error", reject);
                            stream.on("end", () => resolve(Buffer.concat(chunks)));
                        });
                    return await streamToBuffer(response.Body);
                }
                return null;
            } else {
                const safeKey = sanitizeKey(key);
                const baseDir = path.join(process.cwd(), UPLOAD_DIR);
                const targetPath = path.join(baseDir, safeKey);
                if (isPathWithinBase(targetPath, baseDir) && fs.existsSync(targetPath)) {
                    return fs.readFileSync(targetPath);
                }
                return null;
            }
        } catch (error) {
            console.error('Error getting file content:', error);
            return null;
        }
    }
};
