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
// Notes and Word documents send their HTML as a multipart text field: busboy's default 1 MB fieldSize
// rejected any note with a few pasted images, so every autosave failed. Limits match nginx's 50 MB cap.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fieldSize: 50 * 1024 * 1024, fileSize: 50 * 1024 * 1024 }
});

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
