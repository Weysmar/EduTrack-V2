import { Router } from 'express';
import { getFolders, createFolder, deleteFolder } from '../controllers/folderController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getFolders);
router.post('/', createFolder);
router.delete('/:id', deleteFolder);

export default router;
