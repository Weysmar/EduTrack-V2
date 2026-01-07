import { Router } from 'express';
import multer from 'multer';
import { extractText } from '../controllers/extractionController';
import { authenticate } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

router.use(authenticate);

router.post('/', upload.single('file'), extractText);

export default router;
