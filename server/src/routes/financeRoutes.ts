import { Router } from 'express';
import { getBanks, createBank, updateBank, deleteBank } from '../controllers/bankController';
import { getAccounts, getTransactions, previewImport, confirmImport, categorizeTransactions } from '../controllers/financeController';
import multer from 'multer';
import path from 'path';

const router = Router();

// Multer Config
const upload = multer({
    dest: 'uploads/temp/',
    limits: { fileSize: 10 * 1024 * 1024 }, // Boost to 10MB
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.ofx', '.qfx', '.csv', '.xlsx', '.xls'];
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Format non supporté. Utilisez OFX, CSV ou Excel.'));
        }
    }
});

// Banks Routes
router.get('/banks', getBanks);
router.post('/banks', createBank);
router.put('/banks/:id', updateBank);
router.delete('/banks/:id', deleteBank);

// Accounts Routes
router.get('/accounts', getAccounts);

// Transactions Routes
router.get('/transactions', getTransactions);
router.post('/transactions/categorize', categorizeTransactions);

// Import Routes
router.post('/import/preview', upload.single('file'), previewImport);
router.post('/import/confirm', confirmImport);

export default router;
