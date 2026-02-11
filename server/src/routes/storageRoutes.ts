import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { proxyFile, servePublicFile } from '../controllers/storageController';

const router = Router();

// /api/storage/proxy/:key — Requires authentication
router.get('/proxy/:key', authenticate, proxyFile);

// /api/storage/public/* (No auth required, public read-only for static assets)
router.get('/public/*', servePublicFile);

export default router;
