import { Router } from 'express';
import { generateContent, generateJSON } from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// /api/ai/generate
router.post('/generate', generateContent);
// /api/ai/generate-json
router.post('/generate-json', generateJSON);

export default router;
