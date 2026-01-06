import express from 'express';
import { authenticate } from '../middleware/auth';
import { getSummary, saveSummary } from '../controllers/summaryController';

const router = express.Router();

router.get('/', authenticate, getSummary);
router.post('/', authenticate, saveSummary);

export default router;
