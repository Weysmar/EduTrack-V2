import { Router } from 'express';
import { getFlashcardSets, getFlashcardSet, createFlashcardSet, deleteFlashcardSet, updateStudyProgress } from '../controllers/flashcardController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getFlashcardSets);
router.get('/:id', getFlashcardSet);
router.post('/', createFlashcardSet);
router.delete('/:id', deleteFlashcardSet);
router.post('/:id/study', updateStudyProgress);

export default router;
