import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    generateMindMap,
    getMindMaps,
    getMindMap,
    deleteMindMap,
    updateMindMap
} from '../controllers/mindmapController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/mindmaps/generate
router.post('/generate', generateMindMap);

// GET /api/mindmaps
router.get('/', getMindMaps);

// GET /api/mindmaps/:id
router.get('/:id', getMindMap);

// PATCH /api/mindmaps/:id
router.patch('/:id', updateMindMap);

// DELETE /api/mindmaps/:id
router.delete('/:id', deleteMindMap);

export default router;
