import { Router } from 'express';
import multer from 'multer';
import {
    getItems,
    getItem,
    createItem,
    updateItem,
    deleteItem,
    uploadItemFile,
    bulkDeleteItems,
    restoreItem,
    getTrashItems,
    permanentDeleteItem,
    emptyTrash,
    updateItemAnnotations,
    getUrlPreview,
    downloadItemSnapshot
} from '../controllers/itemController';
import { authenticate } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

// Trash & recovery routes (must come before /:id)
router.get('/trash', getTrashItems);
router.post('/trash/empty', emptyTrash);
router.post('/:id/restore', restoreItem);
router.delete('/:id/permanent', permanentDeleteItem);

// Annotation route
router.put('/:id/annotations', updateItemAnnotations);

// URL preview route (must come before /:id)
router.post('/preview-url', getUrlPreview);
router.post('/:id/snapshot', downloadItemSnapshot);

// Standard item CRUD
router.get('/', getItems);
router.get('/:id', getItem);
router.post('/', upload.single('file'), createItem);
router.put('/:id', upload.single('file'), updateItem);
router.delete('/:id', deleteItem);
router.post('/bulk/delete', bulkDeleteItems);
router.post('/:id/upload', upload.single('file'), uploadItemFile);

export default router;
