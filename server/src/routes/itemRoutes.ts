import { Router } from 'express';
import multer from 'multer';
import { getItems, getItem, createItem, updateItem, deleteItem, uploadItemFile, bulkDeleteItems } from '../controllers/itemController';
import { authenticate } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.get('/', getItems);
router.get('/:id', getItem);
router.post('/', upload.single('file'), createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);
router.post('/bulk/delete', bulkDeleteItems);
router.post('/:id/upload', upload.single('file'), uploadItemFile);

export default router;
