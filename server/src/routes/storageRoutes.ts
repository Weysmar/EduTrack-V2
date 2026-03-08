import { Router } from 'express';
import { authenticate as authMiddleware } from '../middleware/auth';
import { proxyFile, servePublicFile } from '../controllers/storageController';

const router = Router();

// /api/storage/proxy/:key - JWT REQUIRED
router.get('/proxy/:key', authMiddleware, proxyFile);

// /api/storage/public/* (No auth required, public read-only)
router.get('/public/*', servePublicFile);

export default router;
