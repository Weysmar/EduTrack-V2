import { Router } from 'express';
import { generateContent, generateJSON } from '../controllers/aiController';
import { authenticate } from '../middleware/auth';
import { aiRateLimit } from '../middleware/aiRateLimit';

const router = Router();
router.use(authenticate);

// /api/ai/generate
router.post('/generate', aiRateLimit, generateContent);
// /api/ai/generate-json
router.post('/generate-json', aiRateLimit, generateJSON);

export default router;
