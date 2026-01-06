import { Router } from 'express';
import { getFolders, createFolder, deleteFolder, getFolder, updateFolder } from '../controllers/folderController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getFolders);
router.post('/', createFolder);
router.get('/:id', getFolder);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

export default router;
