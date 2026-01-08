import { Router } from 'express';
import { proxyFile, getSignedUrl, servePublicFile } from '../controllers/storageController';

const router = Router();

// /api/storage/proxy/:key
router.get('/proxy/:key', proxyFile);

// /api/storage/sign/:key
router.get('/sign/:key', getSignedUrl);

// /api/storage/public/:key (No auth required, uses signature)
router.get('/public/:key', servePublicFile);

export default router;
