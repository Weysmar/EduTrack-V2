import { Router } from 'express';
import { proxyFile, servePublicFile } from '../controllers/storageController';

const router = Router();

// /api/storage/proxy/:key
router.get('/proxy/:key', proxyFile);

// /api/storage/public/* (No auth required, public read-only)
router.get('/public/*', servePublicFile);

export default router;
