import { Router } from 'express';
import { proxyFile } from '../controllers/storageController';

const router = Router();

// /api/storage/proxy/:key
router.get('/proxy/:key', proxyFile);

export default router;
