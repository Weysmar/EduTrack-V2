import { Router } from 'express';
import multer from 'multer';
import { getItems, getItem, createItem, deleteItem, uploadItemFile } from '../controllers/itemController';
import { authenticate } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.get('/', getItems);
router.get('/:id', getItem);
router.post('/', upload.single('file'), createItem);
router.delete('/:id', deleteItem);
router.post('/:id/upload', upload.single('file'), uploadItemFile);

export default router;
